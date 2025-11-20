const express = require('express');
const { body, validationResult } = require('express-validator');
const { validationSets } = require('../validators/productValidation');
const databaseService = require('../services/databaseService');
const { handleUpload } = require('../middleware/uploadMiddleware');
const path = require('path');
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
  
  // If it's a string, check if it is a numeric ID first; otherwise treat as name
  if (typeof brand === 'string') {
    const trimmed = brand.trim();
    if (/^\d+$/.test(trimmed)) {
      const id = parseInt(trimmed, 10);
      const brandData = await databaseService.db.GetBrandById(id);
      if (!brandData) {
        throw new Error(`Brand with ID ${id} not found`);
      }
      return id;
    }
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
  
  // If it's a string, check if it is a numeric ID first; otherwise treat as name
  if (typeof category === 'string') {
    const trimmed = category.trim();
    if (/^\d+$/.test(trimmed)) {
      const id = parseInt(trimmed, 10);
      const categoryData = await databaseService.db.GetCategoryById(id);
      if (!categoryData) {
        throw new Error(`Category with ID ${id} not found`);
      }
      return id;
    }
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
 * Accepts product data (multipart/form-data) and creates a new product with pricing information and images.
 * Supports brand and category lookup by name or ID.
 * Images should be uploaded with field name 'images' (multiple files allowed).
 */
// Note: handleUpload must come first to process multipart/form-data
// Validation is done after files are processed and body is parsed
router.post('/', handleUpload, async (req, res) => {
  try {
    console.log('🔄 Add product request received');
    console.log('📋 Body fields:', req.body);
    console.log('📷 Uploaded files:', req.files ? req.files.length : 0);
    
    // Parse JSON fields from form data (if sent as form-data)
    let bodyData = req.body;
    
    // If body is a string (from multipart/form-data), try to parse it
    if (typeof bodyData === 'string') {
      try {
        bodyData = JSON.parse(bodyData);
      } catch (e) {
        // If not JSON, use as is
      }
    }
    
    // Helper to parse form-data fields (can be arrays or strings)
    const parseField = (field) => {
      if (Array.isArray(field)) return field[0];
      if (typeof field === 'string' && field.trim() !== '') {
        // Try to parse as JSON if it looks like JSON
        if ((field.startsWith('{') || field.startsWith('['))) {
          try {
            return JSON.parse(field);
          } catch (e) {
            return field;
          }
        }
        return field;
      }
      return field;
    };
    
    // Manual validation for required fields (since express-validator doesn't work well with multipart/form-data)
    const parsedTitle = parseField(bodyData.title);
    if (!parsedTitle || typeof parsedTitle !== 'string' || parsedTitle.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Product title is required and must be at least 3 characters'
      });
    }
    
    const parsedPriceMrp = parseField(bodyData.price_mrp);
    if (!parsedPriceMrp || isNaN(parseFloat(parsedPriceMrp)) || parseFloat(parsedPriceMrp) < 0) {
      return res.status(400).json({
        success: false,
        message: 'MRP price is required and must be a valid positive number'
      });
    }
    
    const {
      user_id,
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
      stitching_type,
      ideal_for,
      unit,
      top_length_value,
      top_length_unit,
      sales_package,
      short_description,
      long_description,
      is_active,
      // Price fields
      price_mrp,
      price_sale,
      currency_code,
      valid_from,
      valid_to
    } = bodyData;

    // Extract compliance fields (optional)
    const {
      country_of_origin,
      manufacturer_details,
      packer_details,
      importer_details,
      mfg_month_year,
      customer_care
    } = bodyData;

    // Resolve brand ID (supports name or ID)
    let brandId = null;
    const parsedBrand = parseField(brand);
    if (parsedBrand) {
      try {
        brandId = await getBrandId(parsedBrand);
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
    const parsedCategory = parseField(category);
    if (parsedCategory) {
      try {
        categoryId = await getCategoryId(parsedCategory);
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
      title: parseField(title),
      brand_id: brandId,
      category_id: categoryId,
      sku: parseField(sku) || null,
      style_code: parseField(style_code) || null,
      model_name: parseField(model_name) || null,
      product_type: parseField(product_type) || null,
      color: parseField(color) || null,
      brand_color: parseField(brand_color) || null,
      fabric: parseField(fabric) || null,
      fabric_purity: parseField(fabric_purity) || null,
      composition: parseField(composition) || null,
      pattern: parseField(pattern) || null,
      stitching_type: parseField(stitching_type) || null,
      ideal_for: parseField(ideal_for) || null,
      unit: parseField(unit) || null,
      top_length_value: parseField(top_length_value) ? parseFloat(parseField(top_length_value)) : null,
      top_length_unit: parseField(top_length_unit) || null,
      sales_package: parseField(sales_package) || null,
      short_description: parseField(short_description) || null,
      long_description: parseField(long_description) || null,
      is_active: is_active !== undefined ? (typeof is_active === 'string' ? is_active === 'true' : is_active) : true,
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

    // Insert user-product relationship if user_id is provided
    if (user_id) {
      try {
        console.log('🔄 Inserting user-product relationship...');
        const parsedUserId = parseField(user_id);
        await databaseService.db.InsertUserProduct({
          user_id: parseInt(parsedUserId),
          product_id: productId
        });
        console.log('✅ User-product relationship created successfully');
      } catch (error) {
        console.error('⚠️ Warning: Product created but user-product relationship insertion failed:', error);
        // Continue even if this fails (product is already created)
      }
    }

    // Insert product price (already validated above)
    try {
      console.log('🔄 Inserting product price...');
      const parsedPriceSale = parseField(bodyData.price_sale);
      const parsedCurrencyCode = parseField(bodyData.currency_code) || 'INR';
      const parsedValidFrom = parseField(bodyData.valid_from) || currentTime;
      const parsedValidTo = parseField(bodyData.valid_to) || null;
      
      const priceData = {
        product_id: productId,
        product_type: 'UnstitchedFabricProduct',
        currency_code: parsedCurrencyCode,
        price_mrp: parseFloat(parsedPriceMrp),
        price_sale: parsedPriceSale ? parseFloat(parsedPriceSale) : null,
        valid_from: parsedValidFrom,
        valid_to: parsedValidTo,
        is_active: true,
        created_at: currentTime
      };

      await databaseService.db.InsertProductPrice(priceData);
      console.log('✅ Product price created successfully');
    } catch (error) {
      console.error('⚠️ Warning: Product created but price insertion failed:', error);
      // Continue even if price insertion fails (product is already created)
    }

    // Insert product compliance if any compliance field is provided
    try {
      const hasCompliance =
        parseField(country_of_origin) ||
        parseField(manufacturer_details) ||
        parseField(packer_details) ||
        parseField(importer_details) ||
        parseField(mfg_month_year) ||
        parseField(customer_care);

      if (hasCompliance) {
        console.log('🔄 Inserting product compliance...');
        const complianceData = {
          product_id: productId,
          country_of_origin: parseField(country_of_origin) || null,
          manufacturer_details: parseField(manufacturer_details) || null,
          packer_details: parseField(packer_details) || null,
          importer_details: parseField(importer_details) || null,
          mfg_month_year: parseField(mfg_month_year) || null,
          customer_care: parseField(customer_care) || null
        };
        await databaseService.db.InsertProductCompliance(complianceData);
        console.log('✅ Product compliance saved successfully');
      }
    } catch (error) {
      console.error('⚠️ Warning: Product created but compliance insertion failed:', error);
      // Continue even if compliance insertion fails
    }

    // Handle image uploads
    const uploadedImages = [];
    if (req.files && req.files.length > 0) {
      console.log(`🔄 Processing ${req.files.length} uploaded image(s)...`);
      
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        try {
          // Generate URL for the uploaded image
          // Using relative path that can be accessed via static file serving
          const imageUrl = `/uploads/products/${file.filename}`;
          
          // First image is marked as primary
          const isPrimary = i === 0;
          
          const imageData = {
            product_id: productId,
            url: imageUrl,
            is_primary: isPrimary
          };
          
          await databaseService.db.InsertProductImage(imageData);
          console.log(`✅ Image ${i + 1} saved successfully: ${file.filename}`);
          
          uploadedImages.push({
            filename: file.filename,
            url: imageUrl,
            is_primary: isPrimary,
            size: file.size,
            mimetype: file.mimetype
          });
        } catch (error) {
          console.error(`⚠️ Warning: Failed to save image ${i + 1} (${file.filename}):`, error);
          // Continue processing other images even if one fails
        }
      }
      
      if (uploadedImages.length > 0) {
        console.log(`✅ Successfully saved ${uploadedImages.length} image(s)`);
      }
    }

    // Prepare response
    const response = {
      success: true,
      message: 'Product created successfully',
      data: {
        product: {
          id: productId,
          title: productData.title,
          brand_id: brandId,
          category_id: categoryId,
          sku: productData.sku,
          style_code: productData.style_code,
          model_name: productData.model_name,
          product_type: productData.product_type,
          color: productData.color,
          brand_color: productData.brand_color,
          fabric: productData.fabric,
          is_active: productData.is_active,
          created_at: currentTime
        },
        price: price_mrp ? {
          currency_code: parseField(currency_code) || 'INR',
          price_mrp: parseFloat(parseField(price_mrp)),
          price_sale: parseField(price_sale) ? parseFloat(parseField(price_sale)) : null,
          valid_from: parseField(valid_from) || currentTime,
          valid_to: parseField(valid_to) || null
        } : null,
        images: uploadedImages.length > 0 ? uploadedImages : null
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

/**
 * Get All Products API
 * GET /api/products
 * 
 * Query parameters:
 * - userId: User ID (REQUIRED)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 * - is_active: Filter by active status (0 or 1, default: 1)
 * - productId: Filter by specific product ID
 */
router.get('/', async (req, res) => {
  try {
    console.log('🔄 Get all products request received');
    console.log('📋 Query params:', req.query);
    
    // userId is now REQUIRED
    const userId = req.query.user_id ? parseInt(req.query.user_id) : null;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const productId = req.query.productId ? parseInt(req.query.productId) : null;
    
    // Handle is_active: if explicitly provided (0 or 1), use it; otherwise default to 1
    let isActiveDefined = false;
    let isActiveValue = 1;
    
    if (req.query.is_active !== undefined) {
      isActiveDefined = true;
      isActiveValue = req.query.is_active === '0' || req.query.is_active === 'false' ? 0 : 1;
    }
    
    const offset = (page - 1) * limit;
    
    const parameters = {
      user_id: userId,
      productId,
      limit,
      offset,
      is_active_defined: isActiveDefined,
      is_active_value: isActiveValue
    };
    
    const products = await databaseService.db.GetAllProducts(parameters);
    
    console.log(`✅ Retrieved ${products.length} products`);
    
    // Format products with all associated data
    const formattedProducts = products.map(product => ({
      id: product.id,
      title: product.title,
      user_id: product.user_id,
      user_added_at: product.user_added_at,
      brand: {
        id: product.brand_id,
        name: product.brand_name
      },
      category: {
        id: product.category_id,
        name: product.category_name
      },
      sku: product.sku,
      style_code: product.style_code,
      model_name: product.model_name,
      product_type: product.product_type,
      color: product.color,
      brand_color: product.brand_color,
      fabric: product.fabric,
      fabric_purity: product.fabric_purity,
      composition: product.composition,
      pattern: product.pattern,
      stitching_type: product.stitching_type,
      ideal_for: product.ideal_for,
      unit: product.unit,
      top_length_value: product.top_length_value,
      top_length_unit: product.top_length_unit,
      sales_package: product.sales_package,
      short_description: product.short_description,
      long_description: product.long_description,
      is_active: product.is_active,
      created_at: product.created_at,
      updated_at: product.updated_at,
      price: product.price_id ? {
        id: product.price_id,
        currency_code: product.currency_code,
        price_mrp: product.price_mrp,
        price_sale: product.price_sale,
        valid_from: product.price_valid_from,
        valid_to: product.price_valid_to,
        is_active: product.price_is_active
      } : null,
      compliance: (product.country_of_origin || product.manufacturer_details || product.packer_details) ? {
        country_of_origin: product.country_of_origin,
        manufacturer_details: product.manufacturer_details,
        packer_details: product.packer_details,
        importer_details: product.importer_details,
        mfg_month_year: product.mfg_month_year,
        customer_care: product.customer_care
      } : null,
      primary_image: product.primary_image
    }));
    
    res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
      data: {
        products: formattedProducts,
        pagination: {
          page,
          limit,
          count: formattedProducts.length
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Get all products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get All Product Types API
 * GET /api/products/getAllProductTypes
 * 
 * Returns all active product types from ProductTypes table
 */
router.get('/getAllProductTypes', async (req, res) => {
  try {
    console.log('🔄 Get all product types request received');
    
    // Get all product types
    const productTypes = await databaseService.db.GetAllProductTypes();
    
    console.log(`✅ Retrieved ${productTypes.length} product types`);
    
    res.status(200).json({
      success: true,
      message: 'Product types retrieved successfully',
      data: {
        product_types: productTypes,
        count: productTypes.length
      }
    });
    
  } catch (error) {
    console.error('❌ Get product types error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve product types',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get All Categories API
 * GET /api/products/getAllCategories
 * 
 * Returns all active categories from categories table
 */
router.get('/getAllCategories', async (req, res) => {
  try {
    console.log('🔄 Get all categories request received');
    
    // Get all categories
    const categories = await databaseService.db.GetAllCategories();
    
    console.log(`✅ Retrieved ${categories.length} categories`);
    
    res.status(200).json({
      success: true,
      message: 'Categories retrieved successfully',
      data: {
        categories: categories,
        count: categories.length
      }
    });
    
  } catch (error) {
    console.error('❌ Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get All Brands API
 * GET /api/products/getAllBrands
 * 
 * Returns all active brands from brands table
 */
router.get('/getAllBrands', async (req, res) => {
  try {
    console.log('🔄 Get all brands request received');
    
    // Get all brands
    const brands = await databaseService.db.GetAllBrands();
    
    console.log(`✅ Retrieved ${brands.length} brands`);
    
    res.status(200).json({
      success: true,
      message: 'Brands retrieved successfully',
      data: {
        brands: brands,
        count: brands.length
      }
    });
    
  } catch (error) {
    console.error('❌ Get brands error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve brands',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get Product By ID API
 * GET /api/products/:id
 * 
 * Query parameters:
 * - user_id: Filter by user who added the product
 * 
 * Returns product with all associated data (price, images, compliance)
 */
router.get('/:id', async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const userId = req.query.user_id ? parseInt(req.query.user_id) : null;
    
    console.log('🔄 Get product by ID request received:', productId, 'userId:', userId);
    
    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }
    
    // Get product with basic info, price, and compliance
    const product = await databaseService.db.GetProductById(productId, userId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Get product images
    const images = await databaseService.db.GetProductImages(productId);
    
    // Structure the response
    const response = {
      success: true,
      message: 'Product retrieved successfully',
      data: {
        id: product.id,
        title: product.title,
        user_id: product.user_id,
        user_added_at: product.user_added_at,
        brand: {
          id: product.brand_id,
          name: product.brand_name
        },
        category: {
          id: product.category_id,
          name: product.category_name
        },
        sku: product.sku,
        style_code: product.style_code,
        model_name: product.model_name,
        product_type: product.product_type,
        color: product.color,
        brand_color: product.brand_color,
        fabric: product.fabric,
        fabric_purity: product.fabric_purity,
        composition: product.composition,
        pattern: product.pattern,
        stitching_type: product.stitching_type,
        ideal_for: product.ideal_for,
        unit: product.unit,
        top_length_value: product.top_length_value,
        top_length_unit: product.top_length_unit,
        sales_package: product.sales_package,
        short_description: product.short_description,
        long_description: product.long_description,
        is_active: product.is_active,
        created_at: product.created_at,
        updated_at: product.updated_at,
        price: product.price_id ? {
          id: product.price_id,
          currency_code: product.currency_code,
          price_mrp: product.price_mrp,
          price_sale: product.price_sale,
          valid_from: product.price_valid_from,
          valid_to: product.price_valid_to,
          is_active: product.price_is_active
        } : null,
        compliance: (product.country_of_origin || product.manufacturer_details || product.packer_details) ? {
          country_of_origin: product.country_of_origin,
          manufacturer_details: product.manufacturer_details,
          packer_details: product.packer_details,
          importer_details: product.importer_details,
          mfg_month_year: product.mfg_month_year,
          customer_care: product.customer_care
        } : null,
        images: images.length > 0 ? images : null
      }
    };
    
    console.log('✅ Product retrieved successfully');
    res.status(200).json(response);
    
  } catch (error) {
    console.error('❌ Get product by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Update Product API
 * PUT /api/products/:id
 * 
 * Updates an existing product with all its related data (pricing, images, compliance).
 * Accepts product data (multipart/form-data) similar to create product.
 * Supports brand and category lookup by name or ID.
 * Images should be uploaded with field name 'images' (multiple files allowed).
 * If images are provided, existing images will be deleted and replaced with new ones.
 */
router.put('/:id', handleUpload, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    
    console.log('🔄 Update product request received for ID:', productId);
    console.log('📋 Body fields:', req.body);
    console.log('📷 Uploaded files:', req.files ? req.files.length : 0);
    
    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }
    
    // Check if product exists
    const existingProduct = await databaseService.db.GetProductById(productId);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Parse JSON fields from form data (if sent as form-data)
    let bodyData = req.body;
    
    // If body is a string (from multipart/form-data), try to parse it
    if (typeof bodyData === 'string') {
      try {
        bodyData = JSON.parse(bodyData);
      } catch (e) {
        // If not JSON, use as is
      }
    }
    
    // Helper to parse form-data fields (can be arrays or strings)
    const parseField = (field) => {
      if (Array.isArray(field)) return field[0];
      if (typeof field === 'string' && field.trim() !== '') {
        // Try to parse as JSON if it looks like JSON
        if ((field.startsWith('{') || field.startsWith('['))) {
          try {
            return JSON.parse(field);
          } catch (e) {
            return field;
          }
        }
        return field;
      }
      return field;
    };
    
    // Manual validation for required fields
    const parsedTitle = parseField(bodyData.title);
    if (!parsedTitle || typeof parsedTitle !== 'string' || parsedTitle.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Product title is required and must be at least 3 characters'
      });
    }
    
    const parsedPriceMrp = parseField(bodyData.price_mrp);
    if (!parsedPriceMrp || isNaN(parseFloat(parsedPriceMrp)) || parseFloat(parsedPriceMrp) < 0) {
      return res.status(400).json({
        success: false,
        message: 'MRP price is required and must be a valid positive number'
      });
    }
    
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
      stitching_type,
      ideal_for,
      unit,
      top_length_value,
      top_length_unit,
      sales_package,
      short_description,
      long_description,
      is_active,
      // Price fields
      price_mrp,
      price_sale,
      currency_code,
      valid_from,
      valid_to
    } = bodyData;

    // Extract compliance fields (optional)
    const {
      country_of_origin,
      manufacturer_details,
      packer_details,
      importer_details,
      mfg_month_year,
      customer_care
    } = bodyData;

    // Resolve brand ID (supports name or ID)
    let brandId = null;
    const parsedBrand = parseField(brand);
    if (parsedBrand) {
      try {
        brandId = await getBrandId(parsedBrand);
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
    const parsedCategory = parseField(category);
    if (parsedCategory) {
      try {
        categoryId = await getCategoryId(parsedCategory);
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
      title: parseField(title),
      brand_id: brandId,
      category_id: categoryId,
      sku: parseField(sku) || null,
      style_code: parseField(style_code) || null,
      model_name: parseField(model_name) || null,
      product_type: parseField(product_type) || null,
      color: parseField(color) || null,
      brand_color: parseField(brand_color) || null,
      fabric: parseField(fabric) || null,
      fabric_purity: parseField(fabric_purity) || null,
      composition: parseField(composition) || null,
      pattern: parseField(pattern) || null,
      stitching_type: parseField(stitching_type) || null,
      ideal_for: parseField(ideal_for) || null,
      unit: parseField(unit) || null,
      top_length_value: parseField(top_length_value) ? parseFloat(parseField(top_length_value)) : null,
      top_length_unit: parseField(top_length_unit) || null,
      sales_package: parseField(sales_package) || null,
      short_description: parseField(short_description) || null,
      long_description: parseField(long_description) || null,
      is_active: is_active !== undefined ? (typeof is_active === 'string' ? is_active === 'true' : is_active) : true,
      updated_at: currentTime
    };

    // Update product in database
    try {
      console.log('🔄 Updating product in database...');
      await databaseService.db.UpdateProduct(productId, productData);
      console.log('✅ Product updated successfully');
    } catch (error) {
      console.error('❌ Error updating product:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update product',
        error: process.env.NODE_ENV === 'development' ? (error.message || error.toString()) : undefined
      });
    }

    // Update product price
    try {
      console.log('🔄 Updating product price...');
      const parsedPriceSale = parseField(bodyData.price_sale);
      const parsedCurrencyCode = parseField(bodyData.currency_code) || 'INR';
      const parsedValidFrom = parseField(bodyData.valid_from) || currentTime;
      const parsedValidTo = parseField(bodyData.valid_to) || null;
      
      const priceData = {
        product_type: 'UnstitchedFabricProduct',
        currency_code: parsedCurrencyCode,
        price_mrp: parseFloat(parsedPriceMrp),
        price_sale: parsedPriceSale ? parseFloat(parsedPriceSale) : null,
        valid_from: parsedValidFrom,
        valid_to: parsedValidTo,
        is_active: true
      };

      await databaseService.db.UpdateProductPrice(productId, priceData);
      console.log('✅ Product price updated successfully');
    } catch (error) {
      console.error('⚠️ Warning: Product updated but price update failed:', error);
      // Continue even if price update fails (product is already updated)
    }

    // Update product compliance if any compliance field is provided
    try {
      const hasCompliance =
        parseField(country_of_origin) ||
        parseField(manufacturer_details) ||
        parseField(packer_details) ||
        parseField(importer_details) ||
        parseField(mfg_month_year) ||
        parseField(customer_care);

      if (hasCompliance) {
        console.log('🔄 Updating product compliance...');
        const complianceData = {
          country_of_origin: parseField(country_of_origin) || null,
          manufacturer_details: parseField(manufacturer_details) || null,
          packer_details: parseField(packer_details) || null,
          importer_details: parseField(importer_details) || null,
          mfg_month_year: parseField(mfg_month_year) || null,
          customer_care: parseField(customer_care) || null
        };
        await databaseService.db.UpdateProductCompliance(productId, complianceData);
        console.log('✅ Product compliance updated successfully');
      }
    } catch (error) {
      console.error('⚠️ Warning: Product updated but compliance update failed:', error);
      // Continue even if compliance update fails
    }

    // Handle image uploads - if new images are provided, delete old ones and add new ones
    const uploadedImages = [];
    if (req.files && req.files.length > 0) {
      console.log(`🔄 Processing ${req.files.length} uploaded image(s)...`);
      
      // Delete existing images
      try {
        console.log('🔄 Deleting existing product images...');
        await databaseService.db.DeleteProductImages(productId);
        console.log('✅ Existing images deleted');
      } catch (error) {
        console.error('⚠️ Warning: Failed to delete existing images:', error);
      }
      
      // Insert new images
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        try {
          // Generate URL for the uploaded image
          const imageUrl = `/uploads/products/${file.filename}`;
          
          // First image is marked as primary
          const isPrimary = i === 0;
          
          const imageData = {
            product_id: productId,
            url: imageUrl,
            is_primary: isPrimary
          };
          
          await databaseService.db.InsertProductImage(imageData);
          console.log(`✅ Image ${i + 1} saved successfully: ${file.filename}`);
          
          uploadedImages.push({
            filename: file.filename,
            url: imageUrl,
            is_primary: isPrimary,
            size: file.size,
            mimetype: file.mimetype
          });
        } catch (error) {
          console.error(`⚠️ Warning: Failed to save image ${i + 1} (${file.filename}):`, error);
          // Continue processing other images even if one fails
        }
      }
      
      if (uploadedImages.length > 0) {
        console.log(`✅ Successfully saved ${uploadedImages.length} image(s)`);
      }
    }

    // Prepare response
    const response = {
      success: true,
      message: 'Product updated successfully',
      data: {
        product: {
          id: productId,
          title: productData.title,
          brand_id: brandId,
          category_id: categoryId,
          sku: productData.sku,
          style_code: productData.style_code,
          model_name: productData.model_name,
          product_type: productData.product_type,
          color: productData.color,
          brand_color: productData.brand_color,
          fabric: productData.fabric,
          is_active: productData.is_active,
          updated_at: currentTime
        },
        price: price_mrp ? {
          currency_code: parseField(currency_code) || 'INR',
          price_mrp: parseFloat(parseField(price_mrp)),
          price_sale: parseField(price_sale) ? parseFloat(parseField(price_sale)) : null,
          valid_from: parseField(valid_from) || currentTime,
          valid_to: parseField(valid_to) || null
        } : null,
        images: uploadedImages.length > 0 ? uploadedImages : null
      }
    };

    console.log('🎉 Product update completed successfully');
    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during product update',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Delete Product API
 * DELETE /api/products/:id
 * 
 * Deletes a product and all its related data (price, images, compliance).
 * Product ID should be provided in the URL path.
 */
router.delete('/:id', async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    
    console.log('🔄 Delete product request received for ID:', productId);
    
    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }
    
    // Check if product exists
    const existingProduct = await databaseService.db.GetProductById(productId);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Delete product images first
    try {
      console.log('🔄 Deleting product images...');
      await databaseService.db.DeleteProductImages(productId);
      console.log('✅ Product images deleted');
    } catch (error) {
      console.error('⚠️ Warning: Failed to delete product images:', error);
      // Continue even if image deletion fails
    }
    
    // Delete product compliance
    try {
      console.log('🔄 Deleting product compliance...');
      await databaseService.db.DeleteProductCompliance(productId);
      console.log('✅ Product compliance deleted');
    } catch (error) {
      console.error('⚠️ Warning: Failed to delete product compliance:', error);
      // Continue even if compliance deletion fails
    }
    
    // Delete product price
    try {
      console.log('🔄 Deleting product price...');
      await databaseService.db.DeleteProductPrice(productId);
      console.log('✅ Product price deleted');
    } catch (error) {
      console.error('⚠️ Warning: Failed to delete product price:', error);
      // Continue even if price deletion fails
    }
    
    // Delete user-product relationship
    try {
      console.log('🔄 Deleting user-product relationship...');
      await databaseService.db.DeleteUserProduct(productId);
      console.log('✅ User-product relationship deleted');
    } catch (error) {
      console.error('⚠️ Warning: Failed to delete user-product relationship:', error);
      // Continue even if relationship deletion fails
    }
    
    // Finally, delete the product itself
    try {
      console.log('🔄 Deleting product...');
      await databaseService.db.DeleteProduct(productId);
      console.log('✅ Product deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting product:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete product',
        error: process.env.NODE_ENV === 'development' ? (error.message || error.toString()) : undefined
      });
    }
    
    // Success response
    console.log('🎉 Product deletion completed successfully');
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      data: {
        deleted_product_id: productId
      }
    });
    
  } catch (error) {
    console.error('❌ Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during product deletion',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

