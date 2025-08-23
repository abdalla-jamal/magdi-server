const mongoose = require('mongoose');
const Category = require('../src/models/categoryModel');

// MongoDB connection
const MONGO_URI = 'mongodb+srv://magdiyacoub:magdiyacoub123@cluster0.q7nxmjr.mongodb.net/magdiyacoub';

async function updateCategorySettings() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Update existing "doctors" category with settings
    const updatedCategory = await Category.findOneAndUpdate(
      { name: 'doctors' },
      { 
        $set: { 
          settings: {
            emailRequired: true,
            nameRequired: true,
            allowAnonymous: false,
            description: 'Category for medical staff requiring full identification'
          }
        }
      },
      { new: true, runValidators: true }
    );

    if (updatedCategory) {
      console.log('✅ Updated existing "doctors" category:');
      console.log('ID:', updatedCategory._id);
      console.log('Name:', updatedCategory.name);
      console.log('Settings:', updatedCategory.settings);
    } else {
      console.log('❌ Category "doctors" not found');
    }

    // Create a new test category with emailRequired
    const testCategory = await Category.create({
      name: 'Email Required Test',
      settings: {
        emailRequired: true,
        nameRequired: true,
        allowAnonymous: false,
        testCategory: true
      }
    });

    console.log('\n✅ Created new test category:');
    console.log('ID:', testCategory._id);
    console.log('Name:', testCategory.name);
    console.log('Settings:', testCategory.settings);

    console.log('\n🎯 Categories with emailRequired settings ready for testing!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error updating categories:', error);
    
    // Try to connect to local MongoDB if cloud fails
    if (error.name === 'MongoNetworkError' || error.code === 'ENOTFOUND') {
      console.log('\n🔄 Trying local MongoDB...');
      try {
        await mongoose.disconnect();
        await mongoose.connect('mongodb://localhost:27017/magdiyacoub');
        console.log('Connected to local MongoDB');
        
        // Repeat the operations with local DB
        const updatedCategory = await Category.findOneAndUpdate(
          { name: 'doctors' },
          { 
            $set: { 
              settings: {
                emailRequired: true,
                nameRequired: true,
                allowAnonymous: false,
                description: 'Category for medical staff requiring full identification'
              }
            }
          },
          { new: true, runValidators: true, upsert: true }
        );

        const testCategory = await Category.create({
          name: 'Email Required Test Local',
          settings: {
            emailRequired: true,
            nameRequired: true,
            allowAnonymous: false,
            testCategory: true
          }
        });

        console.log('✅ Local categories created successfully!');
        process.exit(0);
      } catch (localError) {
        console.error('❌ Local MongoDB also failed:', localError);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
}

// Run the update
updateCategorySettings();
