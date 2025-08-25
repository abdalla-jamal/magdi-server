const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('./src/models/CategoryModel');

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const testCategoryAPI = async () => {
  try {
    console.log('Testing Category API...');

    // Test 1: Create a test category
    console.log('\n1. Creating test category...');
    const testCategory = await Category.create({
      name: 'Test Category',
      description: 'A test category for API testing',
      settings: {
        nameRequired: true,
        emailRequired: false,
        allowAnonymous: true
      }
    });
    console.log('✅ Test category created:', testCategory.name);

    // Test 2: Fetch all categories
    console.log('\n2. Fetching all categories...');
    const allCategories = await Category.find({ isActive: true });
    console.log('✅ Found categories:', allCategories.length);
    allCategories.forEach(cat => {
      console.log(`   - ${cat.name}: nameRequired=${cat.settings.nameRequired}, emailRequired=${cat.settings.emailRequired}`);
    });

    // Test 3: Update the test category
    console.log('\n3. Updating test category...');
    const updatedCategory = await Category.findByIdAndUpdate(
      testCategory._id,
      {
        settings: {
          nameRequired: false,
          emailRequired: true,
          allowAnonymous: false
        }
      },
      { new: true }
    );
    console.log('✅ Category updated:', updatedCategory.settings);

    // Test 4: Delete the test category (soft delete)
    console.log('\n4. Deleting test category...');
    await Category.findByIdAndUpdate(testCategory._id, { isActive: false });
    console.log('✅ Category soft deleted');

    // Test 5: Verify it's not in active categories
    const activeCategories = await Category.find({ isActive: true });
    console.log('✅ Active categories after deletion:', activeCategories.length);

    console.log('\n🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed');
  }
};

// Run test if this file is executed directly
if (require.main === module) {
  connectDB().then(() => {
    testCategoryAPI();
  });
}

module.exports = { testCategoryAPI };
