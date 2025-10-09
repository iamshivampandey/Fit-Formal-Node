const Handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

// Load and compile SQL templates
const loadTemplate = (templateName) => {
  try {
    const templatePath = path.join(__dirname, '..', 'templates', 'sql', `${templateName}.hbs`);
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    return Handlebars.compile(templateSource);
  } catch (error) {
    console.error(`❌ Error loading template ${templateName}:`, error.message);
    throw error;
  }
};

// Generate SQL for user insertion
const generateInsertUserSQL = (userData) => {
  try {
    console.log('🔄 Generating INSERT SQL for user:', userData.email);
    
    const template = loadTemplate('insertUser');
    const sql = template(userData);
    
    console.log('✅ SQL generated successfully');
    console.log('📋 Generated SQL:', sql);
    
    return sql;
  } catch (error) {
    console.error('❌ Error generating INSERT SQL:', error.message);
    throw error;
  }
};

// Generate SQL for user update
const generateUpdateUserSQL = (userId, userData) => {
  try {
    console.log('🔄 Generating UPDATE SQL for user ID:', userId);
    
    const setClause = Object.keys(userData)
      .filter(key => userData[key] !== undefined && userData[key] !== null)
      .map(key => `${key} = '${userData[key]}'`)
      .join(', ');
    
    const sql = `UPDATE Users SET ${setClause}, modifiedAt = '${new Date().toISOString()}' WHERE id = ${userId};`;
    
    console.log('✅ UPDATE SQL generated successfully');
    console.log('📋 Generated SQL:', sql);
    
    return sql;
  } catch (error) {
    console.error('❌ Error generating UPDATE SQL:', error.message);
    throw error;
  }
};


// Generate SQL for user deletion
const generateDeleteUserSQL = (userId) => {
  try {
    console.log('🔄 Generating DELETE SQL for user ID:', userId);
    
    const sql = `DELETE FROM Users WHERE id = ${userId};`;
    
    console.log('✅ DELETE SQL generated successfully');
    console.log('📋 Generated SQL:', sql);
    
    return sql;
  } catch (error) {
    console.error('❌ Error generating DELETE SQL:', error.message);
    throw error;
  }
};

module.exports = {
  loadTemplate,
  generateInsertUserSQL,
  generateUpdateUserSQL,
  generateDeleteUserSQL
};
