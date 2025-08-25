const mongoose = require('mongoose');
const Category = require('../src/models/categoryModel');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Default categories to seed
const defaultCategories = [
  {
    name: 'Staff',
    settings: {
      emailRequired: true,
      nameRequired: true,
      departmentTracking: true,
      allowAnonymous: false
    }
  },
  {
    name: 'Patient',
    settings: {
      emailRequired: false,
      nameRequired: false,
      allowAnonymous: true,
      patientIdOptional: true
    }
  },
  {
    name: 'Visitor',
    settings: {
      emailRequired: false,
      nameRequired: false,
      allowAnonymous: true,
      visitPurpose: true
    }
  },
  {
    name: 'General',
    settings: {
      emailRequired: false,
      nameRequired: false,
      allowAnonymous: true,
      public: true
    }
  }
];

async function seedCategories() {
  try {
    // Connect to MongoDB
    const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://magdiyacoub:magdiyacoub123@cluster0.q7nxmjr.mongodb.net/magdiyacoub';
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if categories already exist
    const existingCategories = await Category.countDocuments();
    if (existingCategories > 0) {
      console.log(`${existingCategories} categories already exist. Skipping seed.`);
      console.log('If you want to re-seed, please delete existing categories first.');
      process.exit(0);
    }

    // Insert default categories
    const createdCategories = await Category.insertMany(defaultCategories);
    console.log(`Successfully seeded ${createdCategories.length} categories:`);
    
    createdCategories.forEach(category => {
      console.log(`- ${category.name} (ID: ${category._id})`);
    });

    console.log('\nCategories seeded successfully!');
    process.exit(0);

  } catch (error) {
    console.error('Error seeding categories:', error);
    process.exit(1);
  }
}

// Run the seed function
seedCategories();
