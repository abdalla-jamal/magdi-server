const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('../src/models/CategoryModel');
const Survey = require('../src/models/SurveyModel');

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

const migrateCategories = async () => {
  try {
    console.log('Starting category migration...');

    // Create default categories
    const defaultCategories = [
      {
        name: 'Staff',
        description: 'Surveys for staff members',
        settings: {
          nameRequired: true,
          emailRequired: true,
          allowAnonymous: false
        }
      },
      {
        name: 'Public',
        description: 'Public surveys for general audience',
        settings: {
          nameRequired: false,
          emailRequired: false,
          allowAnonymous: true
        }
      },
      {
        name: 'Customer Feedback',
        description: 'Customer feedback surveys',
        settings: {
          nameRequired: false,
          emailRequired: true,
          allowAnonymous: false
        }
      }
    ];

    // Create categories
    const createdCategories = [];
    for (const categoryData of defaultCategories) {
      try {
        const existingCategory = await Category.findOne({ name: categoryData.name });
        if (existingCategory) {
          console.log(`Category "${categoryData.name}" already exists, skipping...`);
          createdCategories.push(existingCategory);
        } else {
          const category = await Category.create(categoryData);
          console.log(`Created category: ${category.name}`);
          createdCategories.push(category);
        }
      } catch (error) {
        console.error(`Error creating category "${categoryData.name}":`, error.message);
      }
    }

    // Find staff and other categories
    const staffCategory = createdCategories.find(cat => cat.name === 'Staff');
    const publicCategory = createdCategories.find(cat => cat.name === 'Public');

    if (!staffCategory || !publicCategory) {
      console.error('Required categories not found');
      return;
    }

    // Update existing surveys
    console.log('Updating existing surveys...');
    
    // Update surveys with category "staff"
    const staffUpdateResult = await Survey.updateMany(
      { category: 'staff' },
      { category: staffCategory._id }
    );
    console.log(`Updated ${staffUpdateResult.modifiedCount} staff surveys`);

    // Update surveys with category "other"
    const otherUpdateResult = await Survey.updateMany(
      { category: 'other' },
      { category: publicCategory._id }
    );
    console.log(`Updated ${otherUpdateResult.modifiedCount} other surveys`);

    console.log('Category migration completed successfully!');
    
    // Display summary
    const totalSurveys = await Survey.countDocuments();
    const surveysWithCategories = await Survey.countDocuments({ category: { $exists: true, $ne: null } });
    
    console.log('\nMigration Summary:');
    console.log(`- Total surveys: ${totalSurveys}`);
    console.log(`- Surveys with categories: ${surveysWithCategories}`);
    console.log(`- Categories created: ${createdCategories.length}`);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed');
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  connectDB().then(() => {
    migrateCategories();
  });
}

module.exports = { migrateCategories };
