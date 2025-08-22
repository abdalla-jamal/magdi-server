const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
    minlength: [2, 'Category name must be at least 2 characters long'],
    maxlength: [50, 'Category name cannot exceed 50 characters']
  },
  settings: {
    type: Object,
    default: {},
    validate: {
      validator: function(value) {
        // Ensure settings is a plain object if provided
        return value && typeof value === 'object' && !Array.isArray(value);
      },
      message: 'Settings must be a valid object'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual to populate related forms/surveys
categorySchema.virtual('forms', {
  ref: 'Survey', // Assuming your Survey model represents forms
  localField: '_id',
  foreignField: 'category'
});

// Index for better query performance
categorySchema.index({ name: 1 });

// Pre-save middleware to ensure name uniqueness (case-insensitive)
categorySchema.pre('save', async function(next) {
  if (this.isModified('name')) {
    const existingCategory = await this.constructor.findOne({
      name: { $regex: new RegExp(`^${this.name}$`, 'i') },
      _id: { $ne: this._id }
    });
    
    if (existingCategory) {
      const error = new Error('Category name must be unique (case-insensitive)');
      error.code = 11000;
      return next(error);
    }
  }
  next();
});

// Static method to find category with related forms
categorySchema.statics.findByIdWithForms = function(id) {
  return this.findById(id).populate('forms');
};

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
