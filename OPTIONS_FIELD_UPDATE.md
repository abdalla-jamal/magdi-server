# Survey Options Field Update

## Overview
Added a new `options` field to the survey question schema to support better analytics and provide consistency in field naming.

## Changes Made

### 1. Survey Model Update (`src/models/SurveyModel.js`)
- Added `options: [String]` field to the `questionSchema`
- Maintains backward compatibility with existing `Option` field (capital O)

### 2. Analytics Controller Updates (`src/controllers/analyticsController.js`)
- Updated `getAnalytics` function to support both `Option` and `options` fields
- Updated `exportAnalytics` function to handle both fields
- Updated `getQuestionOptions` function to return options from either field

## Field Priority
The system now checks for options in this order:
1. `question.Option` (existing field with capital O)
2. `question.options` (new field with lowercase o)

## Usage Examples

### Creating a Survey with Options
```json
{
  "title": "My Survey",
  "questions": [
    {
      "type": "mcq",
      "questionText": "What is your favorite color?",
      "options": ["Red", "Blue", "Green", "Yellow"]
    },
    {
      "type": "checkbox", 
      "questionText": "Which fruits do you like?",
      "options": ["Apple", "Banana", "Orange", "Mango"]
    }
  ]
}
```

### Analytics Response
The analytics will now return options from either field:
```json
{
  "questionId": "...",
  "question": "What is your favorite color?",
  "type": "mcq",
  "options": ["Red", "Blue", "Green", "Yellow"],
  "totalAnswered": 10,
  "stats": {
    "Red": {"count": 3, "percentage": "30.00%"},
    "Blue": {"count": 4, "percentage": "40.00%"},
    "Green": {"count": 2, "percentage": "20.00%"},
    "Yellow": {"count": 1, "percentage": "10.00%"}
  }
}
```

## Backward Compatibility
- Existing surveys with `Option` field will continue to work
- New surveys can use either `Option` or `options` field
- Analytics functions handle both fields automatically

## API Endpoints
All existing endpoints continue to work:
- `POST /survey/create` - Create survey with options
- `GET /analytics/:surveyId` - Get analytics (supports both fields)
- `GET /analytics/:surveyId/question/:questionId/options` - Get question options
- `GET /analytics/export/:surveyId` - Export analytics (supports both fields) 