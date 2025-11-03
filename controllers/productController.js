const express = require('express');
const { body, validationResult } = require('express-validator');
const { validationSets } = require('../validators/productValidation');
const databaseService = require('../services/databaseService');
const router = express.Router();

/**
 * Helper function to get brand ID (supports both name and ID)
 * @param {string|number} brand - Brand name or ID
 * @returns {Promise<number|null>} Brand ID or null
 */
async function getBrandId(brand) {
  if (!brand) return null;
  
  // If it's already a number, verify it exists and return it
  if (typeof brand === 'number') {
    const brandData = await databaseService.db.GetBrandById(brand);
    if (!brandData) {
      throw new Error(`Brand with ID ${brand} not found`);
    }
    return brand;
  }
  
  // If it's a string, treat it as a name
  if (typeof brand === 'string') {
    const brandData = await databaseService.db.GetBrandByName(brand.trim());
    if (!brandData) {
      throw new Error(`Brand "${brand}" not found. Please create the brand first.`);
    }
    return brandData.id;
  }
  
  return null;
}

/**
 * Helper function to get category ID (supports both name and ID)
 * @param {string|number} category - Category name or ID
 * @returns {Promise<number|null>} Category ID or null
 */
async function getCategoryId(category) {
  if (!category) return null;
  
  // If it's already a number, verify it exists and return it
  if (typeof category === 'number') {
    const categoryData = await databaseService.db.GetCategoryById(category);
    if (!categoryData) {
      throw new Error(`Category with ID ${category} not found`);
    }
    return category;
  }
  
  // If it's a string, treat it as a name
  if (typeof category === 'string') {
    const categoryData = await databaseService.db.GetCategoryByName(category.trim());
    if (!categoryData) {
      throw new Error(`Category "${category}" not found. Please create the category first.`);
    }
    return categoryData.id;
  }
  
  return null;
}

/**
 * Validation error handler middleware
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

/**
 * Add Product API
 * POST /api/products
 * 
 * Accepts product data and creates a new product with pricing information.
 * Supports brand and category lookup by name or ID.
 */
router.post('/', [...validationSets.productCreation, handleValidationErrors], async (req, res) => {
  try {
    console.log('🔄 Add product request received:', req.body);
    
    const {
      title,
      brand,
      category,
      sku,
      style_code,
      model_name,
      product_type,
      color,
      brand_color,
      fabric,
      fabric_purity,
      composition,
      pattern,
      material,
      weave,
      finish,
      width,
      weight,
      unit,
      country_of_origin,
      care_instructions,
      description,
      tags,
      meta_keywords,
      meta_description,
      seo_slug,
      is_active,
      // Price fields
      price_mrp,
      price_sale,
      currency_code,
      valid_from,
      valid_to
    } = req.body;

    // Resolve brand ID (supports name or ID)
    let brandId = null;
    if (brand) {
      try {
        brandId = await getBrandId(brand);
        console.log('✅ Brand resolved:', brandId);
      } catch (error) {
        console.error('❌ Brand resolution error:', error.message);
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
    }

    // Resolve category ID (supports name or ID)
    let categoryId = null;
    if (category) {
      try {
        categoryId = await getCategoryId(category);
        console.log('✅ Category resolved:', categoryId);
      } catch (error) {
        console.error('❌ Category resolution error:', error.message);
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
    }

    // Prepare product data
    const currentTime = new Date().toISOString();
    const productData = {
      title,
      brand_id: brandId,
      category_id: categoryId,
      sku: sku || null,
      style_code: style_code || null,
      model_name: model_name || null,
      product_type: product_type || null,
      color: color || null,
      brand_color: brand_color || null,
      fabric: fabric || null,
      fabric_purity: fabric_purity || null,
      composition: composition || null,
      pattern: pattern || null,
      material: material || null,
      weave: weave || null,
      finish: finish || null,
      width: width || null,
      weight: weight || null,
      unit: unit || null,
      country_of_origin: country_of_origin || null,
      care_instructions: care_instructions || null,
      description: description || null,
      tags: tags || null,
      meta_keywords: meta_keywords || null,
      meta_description: meta_description || null,
      seo_slug: seo_slug || null,
      is_active: is_active !== undefined ? is_active : true,
      created_at: currentTime,
      updated_at: currentTime
    };

    // Insert product into database
    let productId;
    try {
      console.log('🔄 Inserting product into database...');
      const insertResult = await databaseService.db.InsertProduct(productData);
      
      if (!insertResult || !insertResult.productId) {
        throw new Error('Failed to create product');
      }
      
      productId = insertResult.productId;
      console.log('✅ Product created successfully with ID:', productId);
    } catch (error) {
      console.error('❌ Error creating product:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create product',
        error: process.env.NODE_ENV === 'development' ? (error.message || error.toString()) : undefined
      });
    }

    // Insert product price if provided
    if (price_mrp) {
      try {
        console.log('🔄 Inserting product price...');
        const priceData = {
          product_id: productId,
          currency_code: currency_code || 'INR',
          price_mrp,
          price_sale: price_sale || null,
          valid_from: valid_from || currentTime,
          valid_to: valid_to || null,
          is_active: true,
          created_at: currentTime
        };

        await databaseService.db.InsertProductPrice(priceData);
        console.log('✅ Product price created successfully');
      } catch (error) {
        console.error('⚠️ Warning: Product created but price insertion failed:', error);
        // Continue even if price insertion fails (product is already created)
      }
    }

    // Prepare response
    const response = {
      success: true,
      message: 'Product created successfully',
      data: {
        product: {
          id: productId,
          title,
          brand_id: brandId,
          category_id: categoryId,
          sku,
          style_code,
          model_name,
          product_type,
          color,
          brand_color,
          fabric,
          is_active: productData.is_active,
          created_at: currentTime
        },
        price: price_mrp ? {
          currency_code: currency_code || 'INR',
          price_mrp,
          price_sale: price_sale || null,
          valid_from: valid_from || currentTime,
          valid_to: valid_to || null
        } : null
      }
    };

    console.log('🎉 Product creation completed successfully');
    res.status(201).json(response);

  } catch (error) {
    console.error('❌ Add product error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during product creation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

