const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000/api/categories';

// Test data
const testCategory = {
  name: 'Test Category',
  settings: {
    emailRequired: true,
    allowAnonymous: false,
    maxResponses: 100
  }
};

// Test functions
async function testCreateCategory() {
  try {
    console.log('1. Testing CREATE category...');
    const response = await axios.post(BASE_URL, testCategory);
    console.log('✅ Create successful:', response.data);
    return response.data.data._id;
  } catch (error) {
    console.error('❌ Create failed:', error.response?.data || error.message);
    return null;
  }
}

async function testGetAllCategories() {
  try {
    console.log('\n2. Testing GET all categories...');
    const response = await axios.get(BASE_URL);
    console.log('✅ Get all successful:', response.data);
  } catch (error) {
    console.error('❌ Get all failed:', error.response?.data || error.message);
  }
}

async function testGetCategoryById(categoryId) {
  try {
    console.log('\n3. Testing GET category by ID...');
    const response = await axios.get(`${BASE_URL}/${categoryId}`);
    console.log('✅ Get by ID successful:', response.data);
  } catch (error) {
    console.error('❌ Get by ID failed:', error.response?.data || error.message);
  }
}

async function testUpdateCategory(categoryId) {
  try {
    console.log('\n4. Testing UPDATE category...');
    const updateData = {
      name: 'Updated Test Category',
      settings: {
        emailRequired: false,
        allowAnonymous: true,
        maxResponses: 200,
        newField: 'new value'
      }
    };
    const response = await axios.patch(`${BASE_URL}/${categoryId}`, updateData);
    console.log('✅ Update successful:', response.data);
  } catch (error) {
    console.error('❌ Update failed:', error.response?.data || error.message);
  }
}

async function testDeleteCategory(categoryId) {
  try {
    console.log('\n5. Testing DELETE category...');
    const response = await axios.delete(`${BASE_URL}/${categoryId}`);
    console.log('✅ Delete successful:', response.data);
  } catch (error) {
    console.error('❌ Delete failed:', error.response?.data || error.message);
  }
}

async function testDuplicateName() {
  try {
    console.log('\n6. Testing duplicate name validation...');
    await axios.post(BASE_URL, testCategory);
    console.log('❌ Duplicate should have failed');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Duplicate name correctly rejected:', error.response.data);
    } else {
      console.error('❌ Unexpected error:', error.response?.data || error.message);
    }
  }
}

async function testInvalidData() {
  try {
    console.log('\n7. Testing invalid data validation...');
    await axios.post(BASE_URL, { name: '', settings: 'invalid' });
    console.log('❌ Invalid data should have failed');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Invalid data correctly rejected:', error.response.data);
    } else {
      console.error('❌ Unexpected error:', error.response?.data || error.message);
    }
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 Starting Category API Tests...\n');
  console.log('Make sure your server is running on http://localhost:5000\n');

  const categoryId = await testCreateCategory();
  
  if (categoryId) {
    await testGetAllCategories();
    await testGetCategoryById(categoryId);
    await testUpdateCategory(categoryId);
    await testDuplicateName();
    await testInvalidData();
    await testDeleteCategory(categoryId);
  }

  console.log('\n🏁 Tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testCreateCategory,
  testGetAllCategories,
  testGetCategoryById,
  testUpdateCategory,
  testDeleteCategory,
  runTests
};
