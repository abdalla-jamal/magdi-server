const mongoose = require('mongoose');
const Category = require('../src/models/categoryModel');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/magdi-yacoub-survey');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const addEmailRequiredCategory = async () => {
  try {
    await connectDB();
    
    // Check if category already exists
    const existingCategory = await Category.findOne({ name: 'Email Required Category' });
    
    if (existingCategory) {
      console.log('📋 Category already exists, updating settings...');
      existingCategory.settings = {
        emailRequired: true,
        nameRequired: true,
        allowAnonymous: false
      };
      await existingCategory.save();
      console.log('✅ Updated existing category with email requirements');
      console.log('📄 Category:', existingCategory);
    } else {
      console.log('🆕 Creating new category with email requirements...');
      const category = new Category({
        name: 'Email Required Category',
        settings: {
          emailRequired: true,
          nameRequired: true,
          allowAnonymous: false
        }
      });
      
      await category.save();
      console.log('✅ Created new category with email requirements');
      console.log('📄 Category:', category);
    }
    
    // Also check/update existing categories
    const allCategories = await Category.find({});
    console.log('\n📋 All Categories:');
    allCategories.forEach(cat => {
      console.log(`- ${cat.name}: emailRequired = ${cat.settings?.emailRequired || false}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

addEmailRequiredCategory();
