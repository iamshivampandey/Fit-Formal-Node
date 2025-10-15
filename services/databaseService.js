const { executeQuery } = require('../config/database');
const { generateInsertUserSQL, generateUpdateUserSQL, generateDeleteUserSQL, loadTemplate } = require('../utils/sqlTemplate');

class DatabaseService {
  constructor() {
    this.db = {
      // User operations
      InsertUser: this.InsertUser.bind(this),
      UpdateUser: this.UpdateUser.bind(this),
      GetUserByEmail: this.GetUserByEmail.bind(this),
      SelectUsers: this.SelectUsers.bind(this),
      DeleteUser: this.DeleteUser.bind(this),
      // Role operations
      GetRoleByName: this.GetRoleByName.bind(this),
      InsertUserRole: this.InsertUserRole.bind(this),
      GetUserRoles: this.GetUserRoles.bind(this)
    };
  }

  // Insert user using HBS template
  async InsertUser(parameters) {
    try {
      console.log('🔄 DatabaseService.InsertUser called with parameters:', parameters);
      
      // Generate SQL using HBS template
      const sql = generateInsertUserSQL(parameters);
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ User inserted successfully');
      
      return result;
      
    } catch (error) {
      console.error('❌ DatabaseService.InsertUser error:', error);
      throw error;
    }
  }

  // Update user using HBS template
  async UpdateUser(userId, parameters) {
    try {
      console.log('🔄 DatabaseService.UpdateUser called with ID:', userId, 'parameters:', parameters);
      
      // Generate SQL using HBS template
      const sql = generateUpdateUserSQL(userId, parameters);
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ User updated successfully');
      console.log('📊 Update result:', result);
      
      return result;
      
    } catch (error) {
      console.error('❌ DatabaseService.UpdateUser error:', error);
      throw error;
    }
  }

  // Get user by email using HBS template
  async GetUserByEmail(parameters) {
    try {
      console.log('🔄 DatabaseService.GetUserByEmail called with parameters:', parameters);
      
      // Generate SQL using HBS template
      const template = loadTemplate('getUserByEmail');
      const sql = template(parameters);
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ User retrieved successfully');
      console.log('📊 Select result:', result);
      
      return (result && result.recordset) ? result.recordset : [];
      
    } catch (error) {
      console.error('❌ DatabaseService.GetUserByEmail error:', error);
      throw error;
    }
  }

  // Select all users
  async SelectUsers() {
    try {
      console.log('🔄 DatabaseService.SelectUsers called');
      
      // Generate SQL using HBS template (no parameters = all users)
      const template = loadTemplate('selectUser');
      const sql = template({});
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ All users selected successfully');
      console.log('📊 Select result:', result);
      
      return (result && result.recordset) ? result.recordset : [];
      
    } catch (error) {
      console.error('❌ DatabaseService.SelectUsers error:', error);
      throw error;
    }
  }

  // Delete user using HBS template
  async DeleteUser(userId) {
    try {
      console.log('🔄 DatabaseService.DeleteUser called with ID:', userId);
      
      // Generate SQL using HBS template
      const sql = generateDeleteUserSQL(userId);
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ User deleted successfully');
      console.log('📊 Delete result:', result);
      
      return result;
      
    } catch (error) {
      console.error('❌ DatabaseService.DeleteUser error:', error);
      throw error;
    }
  }

  // Get role by name using HBS template
  async GetRoleByName(roleName) {
    try {
      console.log('🔄 DatabaseService.GetRoleByName called with roleName:', roleName);
      
      // Generate SQL using HBS template
      const template = loadTemplate('getRoleByName');
      const sql = template({ roleName });
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ Role retrieved successfully');
      console.log('📊 Role result:', result);
      
      return (result && result.recordset && result.recordset.length > 0) ? result.recordset[0] : null;
      
    } catch (error) {
      console.error('❌ DatabaseService.GetRoleByName error:', error);
      throw error;
    }
  }

  // Insert user role mapping using HBS template
  async InsertUserRole(userId, roleId) {
    try {
      console.log('🔄 DatabaseService.InsertUserRole called with userId:', userId, 'roleId:', roleId);
      
      // Generate SQL using HBS template
      const template = loadTemplate('insertUserRole');
      const sql = template({
        userId,
        roleId,
        assignedAt: new Date().toISOString()
      });
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ User role mapping inserted successfully');
      console.log('📊 Insert result:', result);
      
      return result;
      
    } catch (error) {
      console.error('❌ DatabaseService.InsertUserRole error:', error);
      throw error;
    }
  }

  // Get user roles using HBS template
  async GetUserRoles(userId) {
    try {
      console.log('🔄 DatabaseService.GetUserRoles called with userId:', userId);
      
      // Generate SQL using HBS template
      const template = loadTemplate('getUserRoles');
      const sql = template({ userId });
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ User roles retrieved successfully');
      console.log('📊 Roles result:', result);
      
      return (result && result.recordset) ? result.recordset : [];
      
    } catch (error) {
      console.error('❌ DatabaseService.GetUserRoles error:', error);
      throw error;
    }
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

module.exports = databaseService;
