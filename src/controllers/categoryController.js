const Category = require('../models/CategoryModel');

// Get all categories
const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
};

// Get category by ID
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Category ID is required'
      });
    }

    const category = await Category.findById(id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category',
      error: error.message
    });
  }
};

// Create new category
const createCategory = async (req, res) => {
  try {
    const { name, description, settings } = req.body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    // Check if category with same name already exists
    const existingCategory = await Category.findOne({ 
      name: name.trim(),
      isActive: true 
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    // Prepare category data
    const categoryData = {
      name: name.trim(),
      description: description ? description.trim() : '',
      settings: {
        nameRequired: settings?.nameRequired || false,
        emailRequired: settings?.emailRequired || false,
        allowAnonymous: settings?.allowAnonymous !== undefined ? settings.allowAnonymous : true
      }
    };

    const category = await Category.create(categoryData);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    console.error('Error creating category:', error);
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: error.message
    });
  }
};

// Update category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, settings } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Category ID is required'
      });
    }

    // Check if category exists
    const existingCategory = await Category.findById(id);
    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // If name is being updated, check for duplicates
    if (name && name.trim() !== existingCategory.name) {
      const duplicateCategory = await Category.findOne({ 
        name: name.trim(),
        isActive: true,
        _id: { $ne: id }
      });

      if (duplicateCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (settings !== undefined) {
      updateData.settings = {
        nameRequired: settings.nameRequired !== undefined ? settings.nameRequired : existingCategory.settings.nameRequired,
        emailRequired: settings.emailRequired !== undefined ? settings.emailRequired : existingCategory.settings.emailRequired,
        allowAnonymous: settings.allowAnonymous !== undefined ? settings.allowAnonymous : existingCategory.settings.allowAnonymous
      };
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: updatedCategory
    });
  } catch (error) {
    console.error('Error updating category:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: error.message
    });
  }
};

// Delete category (soft delete)
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { force } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Category ID is required'
      });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // If force delete is requested, permanently delete the category
    if (force === 'true') {
      await Category.findByIdAndDelete(id);
      return res.status(200).json({
        success: true,
        message: 'Category permanently deleted'
      });
    }

    // Soft delete by setting isActive to false
    await Category.findByIdAndUpdate(id, { isActive: false });

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: error.message
    });
  }
};

// Get category settings for validation
const getCategorySettings = async (categoryId) => {
  try {
    const category = await Category.findById(categoryId);
    return category ? category.settings : null;
  } catch (error) {
    console.error('Error fetching category settings:', error);
    return null;
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategorySettings
};
