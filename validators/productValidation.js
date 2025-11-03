const { body } = require('express-validator');

// Reusable validation rules for products
const validationRules = {
  // Title validation
  title: () => body('title')
    .trim()
    .notEmpty()
    .withMessage('Product title is required')
    .isLength({ min: 3, max: 255 })
    .withMessage('Product title must be between 3 and 255 characters'),

  // Brand validation (can be name or id)
  brand: () => body('brand')
    .optional()
    .custom((value) => {
      if (typeof value === 'string' && value.trim().length > 0) {
        return true;
      }
      if (typeof value === 'number' && value > 0) {
        return true;
      }
      throw new Error('Brand must be a string (name) or number (id)');
    }),

  // Category validation (can be name or id)
  category: () => body('category')
    .optional()
    .custom((value) => {
      if (typeof value === 'string' && value.trim().length > 0) {
        return true;
      }
      if (typeof value === 'number' && value > 0) {
        return true;
      }
      throw new Error('Category must be a string (name) or number (id)');
    }),

  // SKU validation
  sku: () => body('sku')
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage('SKU must not exceed 120 characters'),

  // Style code validation
  styleCode: () => body('style_code')
    .optional()
    .trim()
    .isLength({ max: 160 })
    .withMessage('Style code must not exceed 160 characters'),

  // Model name validation
  modelName: () => body('model_name')
    .optional()
    .trim()
    .isLength({ max: 160 })
    .withMessage('Model name must not exceed 160 characters'),

  // Product type validation
  productType: () => body('product_type')
    .optional()
    .trim()
    .isLength({ max: 80 })
    .withMessage('Product type must not exceed 80 characters'),

  // Color validation
  color: () => body('color')
    .optional()
    .trim()
    .isLength({ max: 80 })
    .withMessage('Color must not exceed 80 characters'),

  // Price validation
  priceMrp: () => body('price_mrp')
    .notEmpty()
    .withMessage('MRP price is required')
    .isFloat({ min: 0 })
    .withMessage('MRP price must be a valid positive number'),

  // Sale price validation
  priceSale: () => body('price_sale')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Sale price must be a valid positive number')
    .custom((value, { req }) => {
      if (value && req.body.price_mrp && value >= req.body.price_mrp) {
        throw new Error('Sale price must be less than MRP');
      }
      return true;
    }),

  // Currency code validation
  currencyCode: () => body('currency_code')
    .optional()
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency code must be exactly 3 characters')
    .isUppercase()
    .withMessage('Currency code must be uppercase'),

  // Valid from date validation
  validFrom: () => body('valid_from')
    .optional()
    .isISO8601()
    .withMessage('Valid from date must be a valid ISO 8601 date'),

  // Valid to date validation
  validTo: () => body('valid_to')
    .optional()
    .isISO8601()
    .withMessage('Valid to date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (value && req.body.valid_from) {
        const validFrom = new Date(req.body.valid_from);
        const validTo = new Date(value);
        if (validTo <= validFrom) {
          throw new Error('Valid to date must be after valid from date');
        }
      }
      return true;
    }),

  // Description validation
  description: () => body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description must not exceed 5000 characters'),

  // Is active validation
  isActive: () => body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean')
};

// Predefined validation sets
const validationSets = {
  // Complete product creation validation
  productCreation: [
    validationRules.title(),
    validationRules.brand(),
    validationRules.category(),
    validationRules.sku(),
    validationRules.styleCode(),
    validationRules.modelName(),
    validationRules.productType(),
    validationRules.color(),
    validationRules.priceMrp(),
    validationRules.priceSale(),
    validationRules.currencyCode(),
    validationRules.validFrom(),
    validationRules.validTo(),
    validationRules.description(),
    validationRules.isActive()
  ]
};

module.exports = {
  validationRules,
  validationSets
};

