const Category = require('../models/categoryModel');
const Survey = require('../models/SurveyModel');
const mongoose = require('mongoose');

/**
 * @desc    Create a new category
 * @route   POST /api/categories
 * @access  Public (no auth middleware for now)
 */
const createCategory = async (req, res) => {
  try {
    const { name, settings = {} } = req.body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Category name is required and must be a non-empty string'
      });
    }

    // Validate settings if provided
    if (settings && (typeof settings !== 'object' || Array.isArray(settings))) {
      return res.status(400).json({
        success: false,
        message: 'Settings must be a valid object'
      });
    }

    // Create new category
    const category = new Category({
      name: name.trim(),
      settings
    });

    const savedCategory = await category.save();

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: savedCategory
    });

  } catch (error) {
    console.error('Error creating category:', error);

    // Handle duplicate name error
    if (error.code === 11000 || error.message.includes('unique')) {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists. Please choose a different name.'
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error while creating category',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get all categories
 * @route   GET /api/categories
 * @access  Public (no auth middleware for now)
 */
const getAllCategories = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;

    // Convert to numbers and validate
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (pageNum < 1 || limitNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'Page and limit must be positive numbers'
      });
    }

    // Build search filter
    let filter = {};
    if (search && search.trim()) {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }

    // Calculate skip value for pagination
    const skip = (pageNum - 1) * limitNum;

    // Get total count for pagination metadata
    const totalCategories = await Category.countDocuments(filter);
    const totalPages = Math.ceil(totalCategories / limitNum);

    // Get paginated categories
    const categories = await Category.find(filter)
      .sort({ name: 1 }) // Sort alphabetically by name
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Prepare pagination metadata
    const pagination = {
      currentPage: pageNum,
      totalPages,
      totalCategories,
      categoriesPerPage: limitNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    };

    res.status(200).json({
      success: true,
      message: 'Categories retrieved successfully',
      data: categories,
      pagination
    });

  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get one category by ID with related forms/surveys
 * @route   GET /api/categories/:id
 * @access  Public (no auth middleware for now)
 */
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID format'
      });
    }

    // Find category and populate related surveys/forms
    const category = await Category.findById(id).populate({
      path: 'forms',
      select: 'title description status createdAt updatedAt',
      options: { sort: { createdAt: -1 } }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Get count of related forms for summary
    const formsCount = category.forms ? category.forms.length : 0;

    res.status(200).json({
      success: true,
      message: 'Category retrieved successfully',
      data: {
        ...category.toObject(),
        formsCount
      }
    });

  } catch (error) {
    console.error('Error getting category by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving category',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Update a category (name + settings)
 * @route   PATCH /api/categories/:id
 * @access  Public (no auth middleware for now)
 */
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, settings } = req.body;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID format'
      });
    }

    // Find the category first
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Validate and update fields
    const updateData = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Category name must be a non-empty string'
        });
      }
      updateData.name = name.trim();
    }

    if (settings !== undefined) {
      if (typeof settings !== 'object' || Array.isArray(settings)) {
        return res.status(400).json({
          success: false,
          message: 'Settings must be a valid object'
        });
      }
      updateData.settings = settings;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update'
      });
    }

    // Update the category
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      updateData,
      { 
        new: true, 
        runValidators: true 
      }
    );

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: updatedCategory
    });

  } catch (error) {
    console.error('Error updating category:', error);

    // Handle duplicate name error
    if (error.code === 11000 || error.message.includes('unique')) {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists. Please choose a different name.'
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error while updating category',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Delete a category
 * @route   DELETE /api/categories/:id
 * @access  Public (no auth middleware for now)
 */
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID format'
      });
    }

    // Check if category exists
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category has related surveys/forms
    const relatedSurveys = await Survey.countDocuments({ category: id });
    if (relatedSurveys > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It has ${relatedSurveys} related form(s). Please remove or reassign the forms first.`
      });
    }

    // Delete the category
    await Category.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
      data: {
        deletedCategory: {
          id: category._id,
          name: category.name
        }
      }
    });

  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting category',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
};
