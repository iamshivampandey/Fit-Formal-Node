const sql = require('mssql');

// Database configuration
const dbConfig = {
  server: 'localhost',
  database: 'PaystreamCutoverTest',
  user: 'sa',
  password: 'test',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    multipleActiveResultSets: true,
    connectionTimeout: 30000,
    requestTimeout: 30000
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Test database connection with detailed logging
const testConnection = async () => {
  try {
    console.log('🔄 ===========================================');
    console.log('🔄 ATTEMPTING DATABASE CONNECTION...');
    console.log('🔄 ===========================================');
    console.log(`📊 Database: ${dbConfig.database}`);
    console.log(`🖥️  Server: ${dbConfig.server}`);
    console.log(`👤 User: ${dbConfig.user}`);
    console.log(`🔐 Password: ${'*'.repeat(dbConfig.password.length)}`);
    console.log(`🔒 Encrypt: ${dbConfig.options.encrypt}`);
    console.log(`🛡️  Trust Server Certificate: ${dbConfig.options.trustServerCertificate}`);
    console.log('🔄 ===========================================');
    
    // Create connection pool
    console.log('🔄 Creating connection pool...');
    const pool = await sql.connect(dbConfig);
    console.log('✅ Connection pool created successfully!');
    
    // Test the connection with a simple query
    console.log('🔄 Testing connection with query: SELECT 1 as test');
    const result = await pool.request().query('SELECT 1 as test');
    console.log('✅ Test query executed successfully!');
    console.log('📋 Query result:', result.recordset);
    
    if (result.recordset && result.recordset.length > 0) {
      console.log('🎉 ===========================================');
      console.log('🎉 DATABASE CONNECTION SUCCESSFUL!');
      console.log('🎉 ===========================================');
      console.log('🔗 Connection pool established');
      console.log('📈 Ready to handle database operations');
      console.log('⏰ Connection time:', new Date().toISOString());
      console.log('🎉 ===========================================');
      return pool;
    } else {
      throw new Error('Connection test query failed - no results returned');
    }
    
  } catch (error) {
    console.log('❌ ===========================================');
    console.log('❌ DATABASE CONNECTION FAILED!');
    console.log('❌ ===========================================');
    console.error(`❌ Error: ${error.message}`);
    console.error(`❌ Code: ${error.code || 'Unknown'}`);
    console.error(`❌ Number: ${error.number || 'Unknown'}`);
    console.error(`❌ State: ${error.state || 'Unknown'}`);
    console.error(`❌ Class: ${error.class || 'Unknown'}`);
    console.error(`❌ Server: ${error.server || 'Unknown'}`);
    console.error(`❌ Procedure: ${error.procedure || 'Unknown'}`);
    console.error(`❌ Line Number: ${error.lineNumber || 'Unknown'}`);
    console.log('🔧 ===========================================');
    console.log('🔧 TROUBLESHOOTING TIPS:');
    console.log('🔧 ===========================================');
    console.log('🔧 1. Check if SQL Server is running');
    console.log('🔧 2. Verify database name exists');
    console.log('🔧 3. Check username and password');
    console.log('🔧 4. Ensure SQL Server allows remote connections');
    console.log('🔧 5. Check firewall settings');
    console.log('🔧 6. Verify SQL Server authentication mode');
    console.log('🔧 ===========================================');
    throw error;
  }
};

// Get database connection pool
const getConnection = async () => {
  try {
    if (sql.pools && sql.pools.default) {
      console.log('🔄 Using existing connection pool...');
      return sql.pools.default;
    }
    console.log('🔄 No existing pool found, creating new connection...');
    return await testConnection();
  } catch (error) {
    console.error('❌ Failed to get database connection:', error.message);
    throw error;
  }
};

// Close database connection
const closeConnection = async () => {
  try {
    console.log('🔄 Closing database connection...');
    await sql.close();
    console.log('🔌 Database connection closed successfully');
  } catch (error) {
    console.error('❌ Error closing database connection:', error.message);
  }
};

// Execute a simple query with logging
const executeQuery = async (query, params = {}) => {
  try {
    console.log('🔄 Executing query:', query);
    if (Object.keys(params).length > 0) {
      console.log('📋 Query parameters:', params);
    }
    
    const pool = await getConnection();
    const request = pool.request();
    
    // Add parameters if provided
    Object.keys(params).forEach(key => {
      request.input(key, params[key]);
    });
    
    const result = await request.query(query);
    console.log('✅ Query executed successfully');
    console.log('📊 Rows affected:', result.rowsAffected);
    console.log('📋 Records returned:', result.recordset ? result.recordset.length : 0);
    
    return result;
  } catch (error) {
    console.error('❌ Query execution failed:', error);
    throw error;
  }
};

module.exports = {
  dbConfig,
  testConnection,
  getConnection,
  closeConnection,
  executeQuery,
  sql
};
