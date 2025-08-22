# Category Management API Documentation

## Overview

The Category Management API provides full CRUD operations for managing survey categories. Each category can have custom settings and can be linked to multiple forms/surveys.

## Features

- ✅ Create categories with unique names
- ✅ Retrieve all categories with pagination and search
- ✅ Get category details with related forms
- ✅ Update category name and settings
- ✅ Delete categories (with protection against deletion if forms exist)
- ✅ Case-insensitive unique name validation
- ✅ Flexible settings object for category customization

## API Endpoints

### 1. Create Category
**POST** `/api/categories`

Creates a new category with a unique name and optional settings.

#### Request Body
```json
{
  "name": "Staff",
  "settings": {
    "emailRequired": true,
    "nameRequired": true,
    "departmentTracking": true,
    "allowAnonymous": false
  }
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "_id": "64f123abc456def789012345",
    "name": "Staff",
    "settings": {
      "emailRequired": true,
      "nameRequired": true,
      "departmentTracking": true,
      "allowAnonymous": false
    },
    "createdAt": "2023-09-01T10:00:00.000Z",
    "updatedAt": "2023-09-01T10:00:00.000Z"
  }
}
```

#### Error Responses
- **400 Bad Request**: Invalid data or duplicate name
- **500 Internal Server Error**: Server error

---

### 2. Get All Categories
**GET** `/api/categories`

Retrieves all categories with optional pagination and search functionality.

#### Query Parameters
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search term for category names

#### Example Request
```
GET /api/categories?page=1&limit=5&search=staff
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Categories retrieved successfully",
  "data": [
    {
      "_id": "64f123abc456def789012345",
      "name": "Staff",
      "settings": {
        "emailRequired": true,
        "nameRequired": true
      },
      "createdAt": "2023-09-01T10:00:00.000Z",
      "updatedAt": "2023-09-01T10:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalCategories": 15,
    "categoriesPerPage": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

### 3. Get Category by ID
**GET** `/api/categories/:id`

Retrieves a specific category with all related forms/surveys.

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Category retrieved successfully",
  "data": {
    "_id": "64f123abc456def789012345",
    "name": "Staff",
    "settings": {
      "emailRequired": true,
      "nameRequired": true
    },
    "createdAt": "2023-09-01T10:00:00.000Z",
    "updatedAt": "2023-09-01T10:00:00.000Z",
    "forms": [
      {
        "_id": "64f456def789abc123456789",
        "title": "Employee Satisfaction Survey",
        "description": "Annual employee satisfaction survey",
        "status": "open",
        "createdAt": "2023-09-01T11:00:00.000Z",
        "updatedAt": "2023-09-01T11:00:00.000Z"
      }
    ],
    "formsCount": 1
  }
}
```

#### Error Responses
- **400 Bad Request**: Invalid category ID format
- **404 Not Found**: Category not found

---

### 4. Update Category
**PATCH** `/api/categories/:id`

Updates a category's name and/or settings.

#### Request Body
```json
{
  "name": "Updated Staff Category",
  "settings": {
    "emailRequired": false,
    "allowAnonymous": true,
    "maxResponses": 100
  }
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Category updated successfully",
  "data": {
    "_id": "64f123abc456def789012345",
    "name": "Updated Staff Category",
    "settings": {
      "emailRequired": false,
      "allowAnonymous": true,
      "maxResponses": 100
    },
    "createdAt": "2023-09-01T10:00:00.000Z",
    "updatedAt": "2023-09-01T12:00:00.000Z"
  }
}
```

#### Error Responses
- **400 Bad Request**: Invalid data, duplicate name, or no fields to update
- **404 Not Found**: Category not found

---

### 5. Delete Category
**DELETE** `/api/categories/:id`

Deletes a category. Prevents deletion if the category has related forms.

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Category deleted successfully",
  "data": {
    "deletedCategory": {
      "id": "64f123abc456def789012345",
      "name": "Test Category"
    }
  }
}
```

#### Error Responses
- **400 Bad Request**: Invalid ID format or category has related forms
- **404 Not Found**: Category not found

---

## Model Schema

### Category Model
```javascript
{
  name: {
    type: String,
    required: true,
    unique: true, // Case-insensitive
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  settings: {
    type: Object,
    default: {}
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Example Settings Object
```json
{
  "emailRequired": boolean,
  "nameRequired": boolean,
  "allowAnonymous": boolean,
  "departmentTracking": boolean,
  "maxResponses": number,
  "customFields": array,
  "notifications": {
    "enabled": boolean,
    "recipients": array
  }
}
```

## Integration with Survey Model

The Survey model has been updated to reference categories:

```javascript
// Updated Survey Schema
{
  title: String,
  description: String,
  status: String,
  questions: Array,
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  }
}
```

## Usage Examples

### 1. Creating Categories for Different Use Cases

#### Staff Category
```javascript
POST /api/categories
{
  "name": "Staff",
  "settings": {
    "emailRequired": true,
    "nameRequired": true,
    "departmentTracking": true,
    "allowAnonymous": false
  }
}
```

#### Patient Category
```javascript
POST /api/categories
{
  "name": "Patient",
  "settings": {
    "emailRequired": false,
    "nameRequired": false,
    "allowAnonymous": true,
    "patientIdOptional": true
  }
}
```

#### General Public Category
```javascript
POST /api/categories
{
  "name": "General",
  "settings": {
    "emailRequired": false,
    "nameRequired": false,
    "allowAnonymous": true,
    "public": true
  }
}
```

### 2. Using Category Settings in Survey Logic

```javascript
// In your survey controller
const category = await Category.findById(survey.category);

if (category.settings.emailRequired && !response.email) {
  return res.status(400).json({
    error: 'Email is required for this category'
  });
}

if (category.settings.nameRequired && !response.name) {
  return res.status(400).json({
    error: 'Name is required for this category'
  });
}
```

## Setup Instructions

### 1. Install Dependencies
All required dependencies are already included in the project.

### 2. Seed Default Categories
```bash
npm run seed:categories
```

### 3. Test API Endpoints
```bash
npm run test:categories
```

### 4. Start Server
```bash
npm start
# or for development
npm run dev
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error messages"] // For validation errors
}
```

## Migration Notes

If you have existing surveys with the old category enum (`"staff"`, `"other"`), you'll need to:

1. Create corresponding categories in the database
2. Update existing surveys to reference the new category ObjectIds
3. Remove the old enum validation from your Survey model

Example migration script:
```javascript
// Create categories
const staffCategory = await Category.create({ name: "Staff" });
const otherCategory = await Category.create({ name: "Other" });

// Update existing surveys
await Survey.updateMany(
  { category: "staff" },
  { category: staffCategory._id }
);

await Survey.updateMany(
  { category: "other" },
  { category: otherCategory._id }
);
```

## Best Practices

1. **Unique Names**: Category names are case-insensitive unique
2. **Settings Validation**: Validate settings based on your business logic
3. **Cascade Delete Protection**: Categories with related forms cannot be deleted
4. **Flexible Settings**: Use the settings object for category-specific configurations
5. **Population**: Always populate category data when fetching surveys for complete information

## Security Notes

- No authentication middleware is currently applied as requested
- Add appropriate middleware when implementing in production
- Validate and sanitize all input data
- Consider rate limiting for public endpoints
