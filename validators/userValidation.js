const { body, param, query } = require('express-validator');

// Reusable validation rules
const validationRules = {
  // Email validation
  email: () => body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters'),

  // Password validation
  password: () => body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
    .matches(/^(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
    .withMessage('Password must contain at least one special character'),

  // First name validation
  firstName: () => body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes')
    .customSanitizer(value => {
      // Capitalize first letter of each word
      return value.replace(/\b\w/g, l => l.toUpperCase());
    }),

  // Last name validation
  lastName: () => body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes')
    .customSanitizer(value => {
      // Capitalize first letter of each word
      return value.replace(/\b\w/g, l => l.toUpperCase());
    }),

  // Phone number validation (supports multiple formats)
  phoneNumber: () => body('phoneNumber')
    .optional()
    .trim()
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone number must be between 10 and 15 characters')
    .matches(/^[\+]?[0-9\s\-\(\)]+$/)
    .withMessage('Please provide a valid phone number (digits, spaces, hyphens, parentheses, and optional + prefix)')
    .customSanitizer(value => {
      // Remove all non-digit characters except + at the beginning
      if (value) {
        return value.replace(/[^\d+]/g, '').replace(/^\+/, '+');
      }
      return value;
    }),

  // User ID validation (for params)
  userId: () => param('id')
    .isLength({ min: 1 })
    .withMessage('User ID is required')
    .matches(/^[a-zA-Z0-9]+$/)
    .withMessage('User ID must contain only alphanumeric characters'),

  // Optional email validation (for updates)
  emailOptional: () => body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters'),

  // Optional password validation (for updates)
  passwordOptional: () => body('password')
    .optional()
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
    .matches(/^(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
    .withMessage('Password must contain at least one special character'),

  // Optional first name validation (for updates)
  firstNameOptional: () => body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes')
    .customSanitizer(value => {
      if (value) {
        return value.replace(/\b\w/g, l => l.toUpperCase());
      }
      return value;
    }),

  // Optional last name validation (for updates)
  lastNameOptional: () => body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes')
    .customSanitizer(value => {
      if (value) {
        return value.replace(/\b\w/g, l => l.toUpperCase());
      }
      return value;
    }),

  // Optional phone number validation (for updates)
  phoneNumberOptional: () => body('phoneNumber')
    .optional()
    .trim()
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone number must be between 10 and 15 characters')
    .matches(/^[\+]?[0-9\s\-\(\)]+$/)
    .withMessage('Please provide a valid phone number (digits, spaces, hyphens, parentheses, and optional + prefix)')
    .customSanitizer(value => {
      if (value) {
        return value.replace(/[^\d+]/g, '').replace(/^\+/, '+');
      }
      return value;
    }),

  // Role name validation (optional, defaults to Customer)
  roleName: () => body('roleName')
    .optional()
    .trim()
    .customSanitizer(value => {
      // Capitalize first letter to match database format
      if (value) {
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      }
      return value;
    })
    .isIn(['Admin', 'Customer', 'Seller', 'Tailor', 'Taylorseller'])
    .withMessage('Role name must be one of: Admin, Customer, Seller, Tailor, Taylorseller'),

  // Business Information validations (optional, for Seller/Tailor/Taylorseller roles)
  // Accept businessInfo as a nested object
  businessInfo: () => body('businessInfo')
    .optional()
    .isObject()
    .withMessage('Business info must be an object'),

  businessName: () => body('businessInfo.businessName')
    .optional()
    .trim()
    .isLength({ max: 150 })
    .withMessage('Business name must not exceed 150 characters'),

  ownerName: () => body('businessInfo.ownerName')
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage('Owner name must not exceed 120 characters'),

  businessLogo: () => body('businessInfo.businessLogo')
    .optional()
    .trim()
    .isLength({ max: 500000 })
    .withMessage('Business logo data too large'),

  businessDescription: () => body('businessInfo.businessDescription')
    .optional()
    .trim(),

  businessEmail: () => body('businessInfo.email')
    .optional()
    .trim(),

  businessMobileNumber: () => body('businessInfo.mobileNumber')
    .optional()
    .trim()
    .isLength({ min: 10, max: 15 })
    .withMessage('Mobile number must be between 10 and 15 characters'),

  alternateNumber: () => body('businessInfo.alternateNumber')
    .optional()
    .trim()
    .isLength({ min: 10, max: 15 })
    .withMessage('Alternate number must be between 10 and 15 characters'),

  shopAddress: () => body('businessInfo.shopAddress')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Shop address must not exceed 255 characters'),

  googleMapLink: () => body('businessInfo.googleMapLink')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Google map link must not exceed 255 characters'),

  gpsLatitude: () => body('businessInfo.gpsLatitude')
    .optional()
    .trim(),

  gpsLongitude: () => body('businessInfo.gpsLongitude')
    .optional()
    .trim(),

  workingCity: () => body('businessInfo.workingCity')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Working city must not exceed 100 characters'),

  serviceTypes: () => body('businessInfo.serviceTypes')
    .optional()
    .trim(),

  specialization: () => body('businessInfo.specialization')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Specialization must not exceed 255 characters'),

  yearsOfExperience: () => body('businessInfo.yearsOfExperience')
    .optional()
    .trim(),

  portfolioPhotos: () => body('businessInfo.portfolioPhotos')
    .optional()
    .trim(),

  certifications: () => body('businessInfo.certifications')
    .optional()
    .trim(),

  openingTime: () => body('businessInfo.openingTime')
    .optional()
    .trim(),

  closingTime: () => body('businessInfo.closingTime')
    .optional()
    .trim(),

  weeklyOff: () => body('businessInfo.weeklyOff')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Weekly off must not exceed 20 characters')
};

// Predefined validation sets for common use cases
const validationSets = {
  // Complete user registration validation (with password)
  userRegistration: [
    validationRules.email(),
    validationRules.password(),
    validationRules.firstName(),
    validationRules.lastName(),
    validationRules.phoneNumber(),
    validationRules.roleName(),
    // Business information fields (optional, nested object)
    validationRules.businessInfo(),
    validationRules.businessName(),
    validationRules.ownerName(),
    validationRules.businessLogo(),
    validationRules.businessDescription(),
    validationRules.businessEmail(),
    validationRules.businessMobileNumber(),
    validationRules.alternateNumber(),
    validationRules.shopAddress(),
    validationRules.googleMapLink(),
    validationRules.gpsLatitude(),
    validationRules.gpsLongitude(),
    validationRules.workingCity(),
    validationRules.serviceTypes(),
    validationRules.specialization(),
    validationRules.yearsOfExperience(),
    validationRules.portfolioPhotos(),
    validationRules.certifications(),
    validationRules.openingTime(),
    validationRules.closingTime(),
    validationRules.weeklyOff()
  ],

  // User login validation
  userLogin: [
    validationRules.email(),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],

  // User profile update validation
  userUpdate: [
    validationRules.emailOptional(),
    validationRules.passwordOptional(),
    validationRules.firstNameOptional(),
    validationRules.lastNameOptional(),
    validationRules.phoneNumberOptional()
  ],

  // Basic user info validation (without password)
  userBasicInfo: [
    validationRules.email(),
    validationRules.firstName(),
    validationRules.lastName(),
    validationRules.phoneNumber()
  ],

  // User ID parameter validation
  userIdParam: [
    validationRules.userId()
  ]
};

// Helper function to create custom validation sets
const createValidationSet = (rules) => {
  return rules.map(rule => {
    if (typeof rule === 'string' && validationRules[rule]) {
      return validationRules[rule]();
    }
    return rule;
  });
};

// Validation error handler middleware
const handleValidationErrors = (req, res, next) => {
  const { validationResult } = require('express-validator');
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

// Custom validation functions
const customValidators = {
  // Check if email is unique (you'll need to implement the actual check)
  isEmailUnique: (req, res, next) => {
    // This is a placeholder - implement with your database
    // For now, we'll skip this validation
    next();
  },

  // Check if phone number is unique
  isPhoneUnique: (req, res, next) => {
    // This is a placeholder - implement with your database
    // For now, we'll skip this validation
    next();
  }
};

module.exports = {
  validationRules,
  validationSets,
  createValidationSet,
  handleValidationErrors,
  customValidators
};
