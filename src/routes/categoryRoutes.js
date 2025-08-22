const express = require('express');
const router = express.Router();

const {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');

/**
 * @route   POST /api/categories
 * @desc    Create a new category
 * @access  Public (no auth middleware for now)
 */
router.post('/', createCategory);

/**
 * @route   GET /api/categories
 * @desc    Get all categories with optional search and pagination
 * @access  Public (no auth middleware for now)
 * @query   ?page=1&limit=10&search=categoryName
 */
router.get('/', getAllCategories);

/**
 * @route   GET /api/categories/:id
 * @desc    Get one category by ID with all related forms/surveys
 * @access  Public (no auth middleware for now)
 */
router.get('/:id', getCategoryById);

/**
 * @route   PATCH /api/categories/:id
 * @desc    Update a category (name + settings)
 * @access  Public (no auth middleware for now)
 */
router.patch('/:id', updateCategory);

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete a category (only if no related forms exist)
 * @access  Public (no auth middleware for now)
 */
router.delete('/:id', deleteCategory);

module.exports = router;
