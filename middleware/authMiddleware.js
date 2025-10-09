const jwt = require('jsonwebtoken');

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  try {
    console.log('🔄 Authenticating token...');
    
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.log('❌ Invalid token:', err.message);
        return res.status(403).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }

      console.log('✅ Token verified successfully for user:', decoded.email);
      
      // Add user info to request object
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        firstName: decoded.firstName,
        lastName: decoded.lastName
      };

      next();
    });

  } catch (error) {
    console.error('❌ Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: process.env.NODE_ENV === 'development' ? (error.message || error.toString()) : undefined
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (!err) {
          req.user = {
            userId: decoded.userId,
            email: decoded.email,
            firstName: decoded.firstName,
            lastName: decoded.lastName
          };
        }
      });
    }

    next();
  } catch (error) {
    console.error('❌ Optional auth error:', error);
    next(); // Continue even if auth fails
  }
};

module.exports = {
  authenticateToken,
  optionalAuth
};
