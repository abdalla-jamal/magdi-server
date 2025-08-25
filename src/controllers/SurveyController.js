const Survey = require("../models/SurveyModel");
const Category = require("../models/categoryModel");
const mongoose = require("mongoose");

const createSurvey = async (req, res) => {
  try {
    // Validate status before creating survey
    const validStatuses = ["open", "closed"];
    if (req.body.status && !validStatuses.includes(req.body.status)) {
      return res
        .status(400)
        .json({ error: 'Invalid status value. Must be "open" or "closed".' });
    }
    // Validate category
    if (!req.body.category) {
      return res.status(400).json({ error: 'Category is required.' });
    }

    // Check if category ID is valid ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.body.category)) {
      return res.status(400).json({ error: 'Invalid category ID format.' });
    }

    // Check if category exists in database
    const categoryExists = await Category.findById(req.body.category);
    if (!categoryExists) {
      return res.status(400).json({ error: 'Category not found. Please select a valid category.' });
    }

    const survey = await Survey.create(req.body);
    
    // Generate survey link
    const surveyLink = `${req.protocol}://${req.get('host')}/api/surveys/${survey._id}/respond`;
    
    res.status(201).json({
      survey,
      surveyLink,
      message: 'Survey created successfully! Share this link with respondents.'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getAllSurveys = async (req, res) => {
  try {
    const { page = 1, limit = 6 } = req.query;
    
    // Convert to numbers and validate
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (pageNum < 1 || limitNum < 1) {
      return res.status(400).json({ error: 'Page and limit must be positive numbers' });
    }
    
    const filter = {};
    const questionFilters = {};
    let hasQuestionFilter = false;

    // فلترة الحقول الرئيسية
    for (const [key, value] of Object.entries(req.query)) {
      if (key.startsWith('question_')) {
        hasQuestionFilter = true;
        const qKey = key.replace('question_', '');
        if (['questionText', 'type'].includes(qKey)) {
          questionFilters[qKey] = { $regex: value, $options: 'i' };
        } else if (['Option', 'options'].includes(qKey)) {
          questionFilters[qKey] = { $elemMatch: { $regex: value, $options: 'i' } };
        }
      } else if (['title', 'description'].includes(key)) {
        filter[key] = { $regex: value, $options: 'i' };
      } else if (['status'].includes(key)) {
        filter[key] = value;
      } else if (key === 'from' || key === 'to') {
        filter.createdAt = filter.createdAt || {};
        if (key === 'from') filter.createdAt.$gte = new Date(value);
        if (key === 'to') filter.createdAt.$lte = new Date(value);
      } else if (['createdAt', 'updatedAt'].includes(key)) {
        filter[key] = new Date(value);
      }
    }

    let surveys;
    if (hasQuestionFilter) {
      filter.questions = { $elemMatch: questionFilters };
    }

    // Calculate skip value for pagination
    const skip = (pageNum - 1) * limitNum;
    
    // Get total count for pagination metadata
    const totalSurveys = await Survey.countDocuments(filter);
    const totalPages = Math.ceil(totalSurveys / limitNum);

    surveys = await Survey.find(filter)
      .populate('category', 'name description settings')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // فلترة الأسئلة داخل كل استبيان لو فيه فلتر على الأسئلة
    if (hasQuestionFilter) {
      surveys = surveys.map(survey => {
        const filteredQuestions = survey.questions.filter(q => {
          let match = true;
          for (const [qKey, qVal] of Object.entries(questionFilters)) {
            if (qKey === 'questionText' || qKey === 'type') {
              if (!q[qKey] || !q[qKey].toLowerCase().includes(qVal.$regex.toLowerCase())) {
                match = false;
                break;
              }
            } else if (qKey === 'Option' || qKey === 'options') {
              const arr = q[qKey] || [];
              if (!arr.some(opt => opt && opt.toLowerCase().includes(qVal.$elemMatch.$regex.toLowerCase()))) {
                match = false;
                break;
              }
            }
          }
          return match;
        });
        return { ...survey, questions: filteredQuestions };
      });
    }

    // Prepare pagination metadata
    const pagination = {
      currentPage: pageNum,
      totalPages,
      totalSurveys,
      surveysPerPage: limitNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    };

    res.status(200).json({
      surveys,
      pagination
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getSurveyById = async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id).populate('category', 'name description settings');
    if (!survey) return res.status(404).json({ error: 'Survey not found' });
    
    // تأكد من أن جميع الخصائص موجودة في الرد
    const formattedSurvey = {
      ...survey.toObject(),
      questions: survey.questions.map(q => ({
        ...q.toObject(),
        requireReason: !!q.requireReason // تأكد من وجود خاصية requireReason
      }))
    };
    
    res.status(200).json(formattedSurvey);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get survey for response (public endpoint)
const getSurveyForResponse = async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id).populate('category', 'name description settings');
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    
    if (survey.status !== 'open') {
      return res.status(400).json({ error: 'This survey is not accepting responses' });
    }

    // Return only necessary data for response
    const surveyForResponse = {
      _id: survey._id,
      title: survey.title,
      description: survey.description,
      questions: survey.questions.map(q => ({
        _id: q._id,
        type: q.type,
        questionText: q.questionText,
        options: q.options || q.Option || [],
        requireReason: !!q.requireReason // إضافة خاصية requireReason
      }))
    };

    res.status(200).json(surveyForResponse);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get survey link
const getSurveyLink = async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Survey not found' });
    
    const surveyLink = `${req.protocol}://${req.get('host')}/api/surveys/${survey._id}/respond`;
    
    res.status(200).json({
      surveyId: survey._id,
      surveyTitle: survey.title,
      surveyLink,
      status: survey.status
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateSurvay = async (req, res) => {
  try {
    const survey = await Survey.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!survey) return res.status(404).json({ error: 'Survey not found' });
    res.status(200).json(survey);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteSurvey = async (req, res) => {
  try {
    const survey = await Survey.findByIdAndDelete(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Survey not found' });
    res.status(200).json(survey);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  createSurvey,
  getAllSurveys,
  getSurveyById,
  getSurveyForResponse,
  getSurveyLink,
  updateSurvay,
  deleteSurvey
};
