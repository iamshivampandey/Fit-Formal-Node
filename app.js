// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Import database connection
const { testConnection, closeConnection } = require('./config/database');

// Import database service
const databaseService = require('./services/databaseService');

// Import controllers
const loginController = require('./controllers/loginController');
const productController = require('./controllers/productController');

const app = express();
const PORT = process.env.PORT || 5000;

// Make database service available on app object
app.db = databaseService.db;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

// Routes
app.use('/api/auth', loginController);
app.use('/api/products', productController);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to the API', 
    status: 'running',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Database test endpoint
app.get('/test-db', async (req, res) => {
  try {
    console.log('🔄 Testing database connection via API...');
    await testConnection();
    res.json({
      success: true,
      message: 'Database connection successful!',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Start server with database connection test
const startServer = async () => {
  try {
    console.log('🚀 ===========================================');
    console.log('🚀 STARTING SERVER...');
    console.log('🚀 ===========================================');
    console.log(`🌐 Port: ${PORT}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('🚀 ===========================================');
    
    // Test database connection first
    await testConnection();
    
    // Start the server
    app.listen(PORT, () => {
      console.log('🎉 ===========================================');
      console.log('🎉 SERVER STARTED SUCCESSFULLY!');
      console.log('🎉 ===========================================');
      console.log(`🌐 Server is running on port ${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/`);
      console.log(`🔍 Database test: http://localhost:${PORT}/test-db`);
      console.log(`⏰ Started at: ${new Date().toISOString()}`);
      console.log('✨ Ready to handle requests!');
      console.log('🎉 ===========================================');
    });
    
  } catch (error) {
    console.log('⚠️  ===========================================');
    console.log('⚠️  DATABASE CONNECTION FAILED');
    console.log('⚠️  ===========================================');
    console.error(`⚠️  ${error.message}`);
    console.log('🔄 Server will continue without database connection...');
    console.log('⚠️  ===========================================');
    
    // Start server anyway (without database)
    app.listen(PORT, () => {
      console.log('🚀 ===========================================');
      console.log('🚀 SERVER STARTED (WITHOUT DATABASE)');
      console.log('🚀 ===========================================');
      console.log(`🌐 Server is running on port ${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/`);
      console.log('⚠️  Database features will not be available');
      console.log('⚠️  ===========================================');
    });
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 ===========================================');
  console.log('🛑 SHUTTING DOWN SERVER...');
  console.log('🛑 ===========================================');
  await closeConnection();
  console.log('👋 Server shutdown complete');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 ===========================================');
  console.log('🛑 SHUTTING DOWN SERVER...');
  console.log('🛑 ===========================================');
  await closeConnection();
  console.log('👋 Server shutdown complete');
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
