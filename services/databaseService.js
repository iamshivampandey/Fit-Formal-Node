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
      GetUserRoles: this.GetUserRoles.bind(this),
      // Business Information operations
      InsertBusinessInformation: this.InsertBusinessInformation.bind(this),
      GetBusinessByUserId: this.GetBusinessByUserId.bind(this),
      GetAllBusinesses: this.GetAllBusinesses.bind(this),
      CheckBusinessExists: this.CheckBusinessExists.bind(this),
      UpdateBusinessInformation: this.UpdateBusinessInformation.bind(this),
      UpdateBusinessByBusinessId: this.UpdateBusinessByBusinessId.bind(this),
      UpdateBusinessLogo: this.UpdateBusinessLogo.bind(this),
      DeleteBusinessInformation: this.DeleteBusinessInformation.bind(this),
      // Product operations
      InsertProduct: this.InsertProduct.bind(this),
      UpdateProduct: this.UpdateProduct.bind(this),
      DeleteProduct: this.DeleteProduct.bind(this),
      InsertProductPrice: this.InsertProductPrice.bind(this),
      UpdateProductPrice: this.UpdateProductPrice.bind(this),
      DeleteProductPrice: this.DeleteProductPrice.bind(this),
      InsertProductImage: this.InsertProductImage.bind(this),
      DeleteProductImages: this.DeleteProductImages.bind(this),
      InsertProductCompliance: this.InsertProductCompliance.bind(this),
      UpdateProductCompliance: this.UpdateProductCompliance.bind(this),
      DeleteProductCompliance: this.DeleteProductCompliance.bind(this),
      InsertUserProduct: this.InsertUserProduct.bind(this),
      DeleteUserProduct: this.DeleteUserProduct.bind(this),
      GetProductById: this.GetProductById.bind(this),
      GetProductImages: this.GetProductImages.bind(this),
      GetAllProducts: this.GetAllProducts.bind(this),
      GetBrandByName: this.GetBrandByName.bind(this),
      GetBrandById: this.GetBrandById.bind(this),
      GetAllBrands: this.GetAllBrands.bind(this),
      GetCategoryByName: this.GetCategoryByName.bind(this),
      GetCategoryById: this.GetCategoryById.bind(this),
      GetAllCategories: this.GetAllCategories.bind(this),
      GetAllProductTypes: this.GetAllProductTypes.bind(this),
      InsertProductInventory: this.InsertProductInventory.bind(this),
      UpdateProductInventory: this.UpdateProductInventory.bind(this)
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

  // Insert business information using HBS template
  async InsertBusinessInformation(parameters) {
    try {
      console.log('🔄 DatabaseService.InsertBusinessInformation called with parameters:', parameters);
      
      // Generate SQL using HBS template
      const template = loadTemplate('insertBusinessInformation');
      const sql = template(parameters);
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ Business information inserted successfully');
      console.log('📊 Insert result:', result);
      
      // Get the inserted business ID from the result
      if (result && result.recordset && result.recordset.length > 0) {
        const businessId = result.recordset[0].businessId;
        console.log('✅ Business ID retrieved:', businessId);
        return { success: true, businessId, result };
      } else {
        throw new Error('Failed to retrieve business ID after insertion');
      }
      
    } catch (error) {
      console.error('❌ DatabaseService.InsertBusinessInformation error:', error);
      throw error;
    }
  }

  // Insert product using HBS template
  async InsertProduct(parameters) {
    try {
      console.log('🔄 DatabaseService.InsertProduct called with parameters:', parameters);
      
      // Generate SQL using HBS template
      const template = loadTemplate('insertProduct');
      const sql = template(parameters);
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ Product inserted successfully');
      
      // Get the inserted product ID from the result
      if (result && result.recordset && result.recordset.length > 0) {
        const productId = result.recordset[0].id;
        console.log('✅ Product ID retrieved:', productId);
        return { success: true, productId };
      } else {
        throw new Error('Failed to retrieve product ID after insertion');
      }
      
    } catch (error) {
      console.error('❌ DatabaseService.InsertProduct error:', error);
      throw error;
    }
  }

  // Insert product price using HBS template
  async InsertProductPrice(parameters) {
    try {
      console.log('🔄 DatabaseService.InsertProductPrice called with parameters:', parameters);
      
      // Generate SQL using HBS template
      const template = loadTemplate('insertProductPrice');
      const sql = template(parameters);
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ Product price inserted successfully');
      
      return result;
      
    } catch (error) {
      console.error('❌ DatabaseService.InsertProductPrice error:', error);
      throw error;
    }
  }

  // Get brand by name using HBS template
  async GetBrandByName(name) {
    try {
      console.log('🔄 DatabaseService.GetBrandByName called with name:', name);
      
      // Generate SQL using HBS template
      const template = loadTemplate('getBrandByName');
      const sql = template({ name });
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ Brand retrieved successfully');
      
      return (result && result.recordset && result.recordset.length > 0) ? result.recordset[0] : null;
      
    } catch (error) {
      console.error('❌ DatabaseService.GetBrandByName error:', error);
      throw error;
    }
  }

  // Get brand by ID using HBS template
  async GetBrandById(id) {
    try {
      console.log('🔄 DatabaseService.GetBrandById called with id:', id);
      
      // Generate SQL using HBS template
      const template = loadTemplate('getBrandById');
      const sql = template({ id });
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ Brand retrieved successfully');
      
      return (result && result.recordset && result.recordset.length > 0) ? result.recordset[0] : null;
      
    } catch (error) {
      console.error('❌ DatabaseService.GetBrandById error:', error);
      throw error;
    }
  }

  // Get category by name using HBS template
  async GetCategoryByName(name) {
    try {
      console.log('🔄 DatabaseService.GetCategoryByName called with name:', name);
      
      // Generate SQL using HBS template
      const template = loadTemplate('getCategoryByName');
      const sql = template({ name });
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ Category retrieved successfully');
      
      return (result && result.recordset && result.recordset.length > 0) ? result.recordset[0] : null;
      
    } catch (error) {
      console.error('❌ DatabaseService.GetCategoryByName error:', error);
      throw error;
    }
  }

  // Get category by ID using HBS template
  async GetCategoryById(id) {
    try {
      console.log('🔄 DatabaseService.GetCategoryById called with id:', id);
      
      // Generate SQL using HBS template
      const template = loadTemplate('getCategoryById');
      const sql = template({ id });
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ Category retrieved successfully');
      
      return (result && result.recordset && result.recordset.length > 0) ? result.recordset[0] : null;
      
    } catch (error) {
      console.error('❌ DatabaseService.GetCategoryById error:', error);
      throw error;
    }
  }

  // Insert product image using HBS template
  async InsertProductImage(parameters) {
    try {
      console.log('🔄 DatabaseService.InsertProductImage called with parameters:', parameters);
      
      // Generate SQL using HBS template
      const template = loadTemplate('insertProductImage');
      const sql = template(parameters);
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ Product image inserted successfully');
      
      // Get the inserted image ID from the result
      if (result && result.recordset && result.recordset.length > 0) {
        const imageId = result.recordset[0].id;
        console.log('✅ Product image ID retrieved:', imageId);
        return { success: true, imageId };
      } else {
        throw new Error('Failed to retrieve image ID after insertion');
      }
      
    } catch (error) {
      console.error('❌ DatabaseService.InsertProductImage error:', error);
      throw error;
    }
  }

  // Insert product compliance using HBS template
  async InsertProductCompliance(parameters) {
    try {
      console.log('🔄 DatabaseService.InsertProductCompliance called with parameters:', parameters);
      
      // Generate SQL using HBS template
      const template = loadTemplate('insertProductCompliance');
      const sql = template(parameters);
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ Product compliance inserted successfully');
      
      return result;
      
    } catch (error) {
      console.error('❌ DatabaseService.InsertProductCompliance error:', error);
      throw error;
    }
  }

  // Get product by ID with all associated data
  async GetProductById(id, userId = null) {
    try {
      console.log('🔄 DatabaseService.GetProductById called with id:', id, 'user_id:', userId);
      
      // Generate SQL using HBS template
      const template = loadTemplate('getProductById');
      const sql = template({ id, user_id: userId });
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ Product retrieved successfully');
      
      return (result && result.recordset && result.recordset.length > 0) ? result.recordset[0] : null;
      
    } catch (error) {
      console.error('❌ DatabaseService.GetProductById error:', error);
      throw error;
    }
  }

  // Get product images
  async GetProductImages(productId) {
    try {
      console.log('🔄 DatabaseService.GetProductImages called with productId:', productId);
      
      // Generate SQL using HBS template
      const template = loadTemplate('getProductImages');
      const sql = template({ product_id: productId });
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ Product images retrieved successfully');
      
      return (result && result.recordset) ? result.recordset : [];
      
    } catch (error) {
      console.error('❌ DatabaseService.GetProductImages error:', error);
      throw error;
    }
  }

  // Get all products with pagination
  async GetAllProducts(parameters = {}) {
    try {
      console.log('🔄 DatabaseService.GetAllProducts called with parameters:', parameters);
      
      // Generate SQL using HBS template
      const template = loadTemplate('getAllProducts');
      const sql = template(parameters);
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ Products retrieved successfully');
      
      return (result && result.recordset) ? result.recordset : [];
      
    } catch (error) {
      console.error('❌ DatabaseService.GetAllProducts error:', error);
      throw error;
    }
  }

  // Insert user-product relationship
  async InsertUserProduct(parameters) {
    try {
      console.log('🔄 DatabaseService.InsertUserProduct called with parameters:', parameters);
      
      // Generate SQL using HBS template
      const template = loadTemplate('insertUserProduct');
      const sql = template(parameters);
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ User-product relationship inserted successfully');
      
      return result;
      
    } catch (error) {
      console.error('❌ DatabaseService.InsertUserProduct error:', error);
      throw error;
    }
  }

  // Update product using HBS template
  async UpdateProduct(productId, parameters) {
    try {
      console.log('🔄 DatabaseService.UpdateProduct called with ID:', productId, 'parameters:', parameters);
      
      // Add product_id to parameters
      const updateData = { ...parameters, product_id: productId };
      
      // Generate SQL using HBS template
      const template = loadTemplate('updateProduct');
      const sql = template(updateData);
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ Product updated successfully');
      
      return result;
      
    } catch (error) {
      console.error('❌ DatabaseService.UpdateProduct error:', error);
      throw error;
    }
  }

  // Update product price using HBS template
  async UpdateProductPrice(productId, parameters) {
    try {
      console.log('🔄 DatabaseService.UpdateProductPrice called with productId:', productId, 'parameters:', parameters);
      
      // Add product_id to parameters
      const updateData = { ...parameters, product_id: productId };
      
      // Generate SQL using HBS template
      const template = loadTemplate('updateProductPrice');
      const sql = template(updateData);
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ Product price updated successfully');
      
      return result;
      
    } catch (error) {
      console.error('❌ DatabaseService.UpdateProductPrice error:', error);
      throw error;
    }
  }

  // Update product compliance using HBS template
  async UpdateProductCompliance(productId, parameters) {
    try {
      console.log('🔄 DatabaseService.UpdateProductCompliance called with productId:', productId, 'parameters:', parameters);
      
      // Add product_id to parameters
      const updateData = { ...parameters, product_id: productId };
      
      // Generate SQL using HBS template
      const template = loadTemplate('updateProductCompliance');
      const sql = template(updateData);
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ Product compliance updated successfully');
      
      return result;
      
    } catch (error) {
      console.error('❌ DatabaseService.UpdateProductCompliance error:', error);
      throw error;
    }
  }

  // Delete product images using HBS template
  async DeleteProductImages(productId) {
    try {
      console.log('🔄 DatabaseService.DeleteProductImages called with productId:', productId);
      
      // Generate SQL using HBS template
      const template = loadTemplate('deleteProductImages');
      const sql = template({ product_id: productId });
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ Product images deleted successfully');
      
      return result;
      
    } catch (error) {
      console.error('❌ DatabaseService.DeleteProductImages error:', error);
      throw error;
    }
  }

  // Delete product using HBS template
  async DeleteProduct(productId) {
    try {
      console.log('🔄 DatabaseService.DeleteProduct called with productId:', productId);
      
      // Generate SQL using HBS template
      const template = loadTemplate('deleteProduct');
      const sql = template({ product_id: productId });
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ Product deleted successfully');
      
      return result;
      
    } catch (error) {
      console.error('❌ DatabaseService.DeleteProduct error:', error);
      throw error;
    }
  }

  // Delete product price using HBS template
  async DeleteProductPrice(productId) {
    try {
      console.log('🔄 DatabaseService.DeleteProductPrice called with productId:', productId);
      
      // Generate SQL using HBS template
      const template = loadTemplate('deleteProductPrice');
      const sql = template({ product_id: productId });
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ Product price deleted successfully');
      
      return result;
      
    } catch (error) {
      console.error('❌ DatabaseService.DeleteProductPrice error:', error);
      throw error;
    }
  }

  // Delete product compliance using HBS template
  async DeleteProductCompliance(productId) {
    try {
      console.log('🔄 DatabaseService.DeleteProductCompliance called with productId:', productId);
      
      // Generate SQL using HBS template
      const template = loadTemplate('deleteProductCompliance');
      const sql = template({ product_id: productId });
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ Product compliance deleted successfully');
      
      return result;
      
    } catch (error) {
      console.error('❌ DatabaseService.DeleteProductCompliance error:', error);
      throw error;
    }
  }

  // Delete user-product relationship using HBS template
  async DeleteUserProduct(productId) {
    try {
      console.log('🔄 DatabaseService.DeleteUserProduct called with productId:', productId);
      
      // Generate SQL using HBS template
      const template = loadTemplate('deleteUserProduct');
      const sql = template({ product_id: productId });
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ User-product relationship deleted successfully');
      
      return result;
      
    } catch (error) {
      console.error('❌ DatabaseService.DeleteUserProduct error:', error);
      throw error;
    }
  }

  // Get all product types using HBS template
  async GetAllProductTypes() {
    try {
      console.log('🔄 DatabaseService.GetAllProductTypes called');
      
      // Generate SQL using HBS template
      const template = loadTemplate('getAllProductTypes');
      const sql = template({});
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ Product types retrieved successfully');
      
      return (result && result.recordset) ? result.recordset : [];
      
    } catch (error) {
      console.error('❌ DatabaseService.GetAllProductTypes error:', error);
      throw error;
    }
  }

  // Get all categories using HBS template
  async GetAllCategories() {
    try {
      console.log('🔄 DatabaseService.GetAllCategories called');
      
      // Generate SQL using HBS template
      const template = loadTemplate('getAllCategories');
      const sql = template({});
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ Categories retrieved successfully');
      
      return (result && result.recordset) ? result.recordset : [];
      
    } catch (error) {
      console.error('❌ DatabaseService.GetAllCategories error:', error);
      throw error;
    }
  }

  // Get all brands using HBS template
  async GetAllBrands() {
    try {
      console.log('🔄 DatabaseService.GetAllBrands called');
      
      // Generate SQL using HBS template
      const template = loadTemplate('getAllBrands');
      const sql = template({});
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ Brands retrieved successfully');
      
      return (result && result.recordset) ? result.recordset : [];
      
    } catch (error) {
      console.error('❌ DatabaseService.GetAllBrands error:', error);
      throw error;
    }
  }

  // Insert product inventory using HBS template
  async InsertProductInventory(parameters) {
    try {
      console.log('🔄 DatabaseService.InsertProductInventory called with parameters:', parameters);
      
      // Generate SQL using HBS template
      const template = loadTemplate('insertProductInventory');
      const sql = template(parameters);
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ Product inventory inserted successfully');
      
      return result;
      
    } catch (error) {
      console.error('❌ DatabaseService.InsertProductInventory error:', error);
      throw error;
    }
  }

  // Update product inventory using HBS template
  async UpdateProductInventory(productId, parameters) {
    try {
      console.log('🔄 DatabaseService.UpdateProductInventory called with productId:', productId, 'parameters:', parameters);
      
      // Add product_id to parameters
      const updateData = { ...parameters, product_id: productId };
      
      // Generate SQL using HBS template
      const template = loadTemplate('updateProductInventory');
      const sql = template(updateData);
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ Product inventory updated successfully');
      
      return result;
      
    } catch (error) {
      console.error('❌ DatabaseService.UpdateProductInventory error:', error);
      throw error;
    }
  }

  // ==================== Business Information Operations ====================

  // Get business by user ID using HBS template
  async GetBusinessByUserId(parameters) {
    try {
      console.log('🔄 DatabaseService.GetBusinessByUserId called with parameters:', parameters);
      
      // Generate SQL using HBS template
      const template = loadTemplate('getBusinessByUserId');
      const sql = template(parameters);
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ Business retrieved successfully');
      
      return (result && result.recordset && result.recordset.length > 0) ? result.recordset[0] : null;
      
    } catch (error) {
      console.error('❌ DatabaseService.GetBusinessByUserId error:', error);
      throw error;
    }
  }

  // Get all businesses using HBS template
  async GetAllBusinesses() {
    try {
      console.log('🔄 DatabaseService.GetAllBusinesses called');
      
      // Generate SQL using HBS template
      const template = loadTemplate('getAllBusinesses');
      const sql = template({});
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ All businesses retrieved successfully');
      
      return (result && result.recordset) ? result.recordset : [];
      
    } catch (error) {
      console.error('❌ DatabaseService.GetAllBusinesses error:', error);
      throw error;
    }
  }

  // Check if business exists using HBS template
  async CheckBusinessExists(parameters) {
    try {
      console.log('🔄 DatabaseService.CheckBusinessExists called with parameters:', parameters);
      
      // Generate SQL using HBS template
      const template = loadTemplate('checkBusinessExists');
      const sql = template(parameters);
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ Business check completed');
      
      return (result && result.recordset && result.recordset.length > 0) ? result.recordset[0] : null;
      
    } catch (error) {
      console.error('❌ DatabaseService.CheckBusinessExists error:', error);
      throw error;
    }
  }

  // Update business information using HBS template
  async UpdateBusinessInformation(parameters) {
    try {
      console.log('🔄 DatabaseService.UpdateBusinessInformation called with parameters:', parameters);
      
      // Generate SQL using HBS template
      const template = loadTemplate('updateBusinessInformation');
      const sql = template(parameters);
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ Business information updated successfully');
      
      return result;
      
    } catch (error) {
      console.error('❌ DatabaseService.UpdateBusinessInformation error:', error);
      throw error;
    }
  }

  // Update business information by business ID dynamically
  async UpdateBusinessByBusinessId(parameters) {
    try {
      console.log('🔄 DatabaseService.UpdateBusinessByBusinessId called with parameters:', parameters);
      
      const { businessId, ...updateFields } = parameters;
      
      // Build SET clause dynamically for fields that are provided
      const setStatements = [];
      
      for (const [key, value] of Object.entries(updateFields)) {
        if (value !== undefined) {
          // Handle different data types
          if (value === null) {
            setStatements.push(`${key} = NULL`);
          } else if (typeof value === 'number') {
            setStatements.push(`${key} = ${value}`);
          } else if (typeof value === 'boolean') {
            setStatements.push(`${key} = ${value ? 1 : 0}`);
          } else {
            // String: escape single quotes by doubling them
            const escapedValue = String(value).replace(/'/g, "''");
            setStatements.push(`${key} = '${escapedValue}'`);
          }
        }
      }
      
      if (setStatements.length === 0) {
        throw new Error('No fields provided to update');
      }
      
      // Add updated_at timestamp
      setStatements.push('updated_at = GETDATE()');
      
      // Build final SQL
      const sql = `UPDATE BusinessInformations SET ${setStatements.join(', ')} WHERE businessId = ${businessId}`;
      
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ Business information updated successfully by business ID');
      
      return result;
      
    } catch (error) {
      console.error('❌ DatabaseService.UpdateBusinessByBusinessId error:', error);
      throw error;
    }
  }

  // Update business logo only using HBS template
  async UpdateBusinessLogo(parameters) {
    try {
      console.log('🔄 DatabaseService.UpdateBusinessLogo called with parameters:', parameters);
      
      // Generate SQL using HBS template
      const template = loadTemplate('updateBusinessLogo');
      const sql = template(parameters);
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ Business logo updated successfully');
      
      return result;
      
    } catch (error) {
      console.error('❌ DatabaseService.UpdateBusinessLogo error:', error);
      throw error;
    }
  }

  // Delete business information using HBS template
  async DeleteBusinessInformation(parameters) {
    try {
      console.log('🔄 DatabaseService.DeleteBusinessInformation called with parameters:', parameters);
      
      // Generate SQL using HBS template
      const template = loadTemplate('deleteBusinessInformation');
      const sql = template(parameters);
      console.log('📋 Generated SQL:', sql);
      
      // Execute the SQL query
      const result = await executeQuery(sql);
      console.log('✅ Business information deleted successfully');
      
      return result;
      
    } catch (error) {
      console.error('❌ DatabaseService.DeleteBusinessInformation error:', error);
      throw error;
    }
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

module.exports = databaseService;
