const { validationResult } = require('express-validator');
const { validationSets, handleValidationErrors } = require('../validators/userValidation');

// Generic validation middleware factory
const createValidationMiddleware = (validationRules) => {
  return [
    ...validationRules,
    handleValidationErrors
  ];
};

// Pre-built validation middlewares for common use cases
const validationMiddleware = {
  // User registration validation
  validateUserRegistration: createValidationMiddleware(validationSets.userRegistration),
  
  // User login validation
  validateUserLogin: createValidationMiddleware(validationSets.userLogin),
  
  // User update validation
  validateUserUpdate: createValidationMiddleware(validationSets.userUpdate),
  
  // Basic user info validation
  validateUserBasicInfo: createValidationMiddleware(validationSets.userBasicInfo),
  
  // User ID parameter validation
  validateUserId: createValidationMiddleware(validationSets.userIdParam)
};

// Custom validation middleware for specific scenarios
const customValidationMiddleware = {
  // Validate user registration with custom business rules
  validateUserRegistrationWithBusinessRules: [
    ...validationSets.userRegistration,
    // Add custom validations here
    handleValidationErrors
  ],

  // Validate user login with additional security checks
  validateUserLoginWithSecurity: [
    ...validationSets.userLogin,
    // Add security validations here
    handleValidationErrors
  ]
};

// Utility function to create validation middleware on the fly
const createCustomValidation = (...rules) => {
  return createValidationMiddleware(rules);
};

// Error handling for validation
const validationErrorHandler = (err, req, res, next) => {
  if (err.type === 'validation') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors
    });
  }
  next(err);
};

module.exports = {
  validationMiddleware,
  customValidationMiddleware,
  createCustomValidation,
  createValidationMiddleware,
  validationErrorHandler
};
