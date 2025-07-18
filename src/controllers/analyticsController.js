const Survey = require('../models/SurveyModel');
const Response = require('../models/response_model');
const {
  exportToCSV,
  exportAnswersByQuestionToCSV
} = require('../utils/analyticsExportUtils');
const { Parser } = require('json2csv');

// Get analytics data for a specific survey
const getAnalytics = async (req, res) => {
  try {
    const { surveyId } = req.params;

    const survey = await Survey.findById(surveyId).lean();
    if (!survey) return res.status(404).json({ message: 'Survey not found' });

    console.log("Survey questions:", survey.questions);

    const responses = await Response.find({ surveyId }).sort({ createdAt: 1 }).lean();
    const totalResponses = responses.length;

    const analytics = survey.questions.map((question) => {
      // تجميع كل الإجابات الخاصة بالسؤال من الردود
      const answers = responses.map(response => {
        const match = response.answers.find(a => a.questionId.toString() === question._id.toString());
        return match ? match.answer : null;
      });

      // أسئلة اختيار متعددة أو اختيار واحد (mcq/checkbox)
      if ((question.type === 'mcq' || question.type === 'checkbox' || question.type === 'radio')) {
        // دعم كل من Option و options
        const opts = question.Option && Array.isArray(question.Option) && question.Option.length > 0
          ? question.Option
          : (question.options && Array.isArray(question.options) ? question.options : []);
        const optionStats = {};
        const validAnswers = answers.filter(ans => ans !== null);
        const totalAnswered = validAnswers.length;

        // تهيئة كل اختيار بالـ count صفر
        opts.forEach(option => {
          optionStats[option] = { count: 0, percentage: "0.00%" };
        });

        // جمع الإحصائيات الفعلية
        validAnswers.forEach(answer => {
          if (question.type === 'mcq' || question.type ==='radio') {
            if (optionStats.hasOwnProperty(answer)) {
              optionStats[answer].count += 1;
            }
          } else if (question.type === 'checkbox' && Array.isArray(answer)) {
            answer.forEach(opt => {
              if (optionStats.hasOwnProperty(opt)) {
                optionStats[opt].count += 1;
              }
            });
          }
        } );

        // حساب النسبة المئوية
        Object.keys(optionStats).forEach(option => {
          const count = optionStats[option].count;
          const percentage = totalAnswered > 0 ? ((count / totalAnswered) * 100).toFixed(2) : "0.00";
          optionStats[option].percentage = `${percentage}%`;
        });

        return {
          questionId: question._id,
          question: question.questionText,
          type: question.type,
          options: opts,
          totalAnswered,
          totalSkipped: totalResponses - totalAnswered,
          stats: optionStats
        };
      }

      // أسئلة تقييم (rating)
      else if (question.type === 'rating') {
        const numericAnswers = answers.filter(a => !isNaN(Number(a)));
        const total = numericAnswers.reduce((sum, a) => sum + Number(a), 0);
        const average = numericAnswers.length ? (total / numericAnswers.length).toFixed(2) : '0';

        // توزيع الأجوبة حسب الرقم
        const distribution = {};
        // عد كل رقم موجود في التقييم
        numericAnswers.forEach(a => {
          distribution[a] = (distribution[a] || 0) + 1;
        });
        // عد الخانات الفارغة (null أو غير مُجابة)
        const nullCount = answers.filter(a => a === null).length;
        if (nullCount > 0) distribution['null'] = nullCount;

        return {
          questionId: question._id,
          question: question.questionText,
          type: question.type,
          average,
          distribution
        };
      }

      // أسئلة نصية قصيرة (short_answer أو text)
      else if (question.type === 'text') {
        const validAnswers = answers.filter(a => a !== null && a !== '');
        return {
          questionId: question._id,
          question: question.questionText,
          type: question.type,
          totalAnswers: validAnswers.length,
          sampleAnswers: validAnswers
        };
      }

      // لأي نوع سؤال غير معروف
      return {
        questionId: question._id,
        question: question.questionText,
        type: question.type,
        stats: {}
      };
    });

    // تحليلات النشاط حسب التاريخ
    const activityByDate = {};
    responses.forEach(r => {
      const date = new Date(r.createdAt).toISOString().split('T')[0];
      activityByDate[date] = (activityByDate[date] || 0) + 1;
    });

    const activityDates = Object.keys(activityByDate).sort();
    const totalDays = activityDates.length;
    const avgResponsesPerDay = totalDays ? (totalResponses / totalDays).toFixed(2) : '0';

    let mostActiveDay = '';
    let maxResponses = 0;
    for (let date in activityByDate) {
      if (activityByDate[date] > maxResponses) {
        maxResponses = activityByDate[date];
        mostActiveDay = date;
      }
    }

    let activityLevel = 'Low';
    if (avgResponsesPerDay >= 10) activityLevel = 'High';
    else if (avgResponsesPerDay >= 4) activityLevel = 'Medium';

    // إرجاع البيانات كاملة
    res.json({
      surveyTitle: survey.title,
      totalResponses,
      activityByDate,
      activitySummary: {
        totalDays,
        avgResponsesPerDay,
        mostActiveDay,
        maxResponsesOnMostActiveDay: maxResponses,
        activityLevel
      },
      analytics
    });

  } catch (err) {
    console.error('Error in getAnalytics:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};




const exportAnalytics = async (req, res) => {
  try {
    const { surveyId } = req.params;
    const format = req.query.format || 'csv';

    const survey = await Survey.findById(surveyId).lean();
    if (!survey) return res.status(404).json({ message: 'Survey not found' });

    const responses = await Response.find({ surveyId }).lean();
    const totalResponses = responses.length;

    // activityByDate و activitySummary كما سبق

    const activityByDate = {};
    responses.forEach(r => {
      const date = new Date(r.createdAt).toISOString().slice(0, 10);
      activityByDate[date] = (activityByDate[date] || 0) + 1;
    });

    const activityDates = Object.keys(activityByDate).sort();
    const totalDays = activityDates.length;
    const totalResponsesAll = Object.values(activityByDate).reduce((a, b) => a + b, 0);
    const avgResponsesPerDay = totalDays ? (totalResponsesAll / totalDays).toFixed(2) : '0';
    const mostActiveDay = activityDates.reduce((maxDay, day) => {
      return activityByDate[day] > (activityByDate[maxDay] || 0) ? day : maxDay;
    }, activityDates[0] || null);
    const maxResponsesOnMostActiveDay = mostActiveDay ? activityByDate[mostActiveDay] : 0;

    let activityLevel = 'Low';
    if (avgResponsesPerDay > 10) activityLevel = 'High';
    else if (avgResponsesPerDay > 3) activityLevel = 'Medium';

    const activitySummary = {
      totalDays,
      avgResponsesPerDay,
      mostActiveDay,
      maxResponsesOnMostActiveDay,
      activityLevel
    };

    // نوع السؤال المعالج لتغطية الأنواع المختلفة
    const mapQuestionType = (type) => {
      switch (type) {
        case 'checkbox': return 'multiple_choice';
        case 'mcq': return 'single_choice';
        case 'text': return 'short_answer';
        default: return type;
      }
    };

    const analytics = survey.questions.map(question => {
      const qType = mapQuestionType(question.type);

      const answers = responses.map(response => {
        const match = response.answers.find(a => a.questionId.toString() === question._id.toString());
        return match ? match.answer : null;
      });

      // دعم كل من Option و options
      const opts = question.Option && Array.isArray(question.Option) && question.Option.length > 0
        ? question.Option
        : (question.options && Array.isArray(question.options) ? question.options : []);

      if ((qType === 'multiple_choice' || qType === 'single_choice') && opts.length > 0) {
        const stats = {};
        opts.forEach(option => stats[option] = 0);
        answers.forEach(answer => {
          if (Array.isArray(answer)) {
            answer.forEach(choice => {
              if (stats[choice] !== undefined) stats[choice]++;
            });
          } else if (stats[answer] !== undefined) {
            stats[answer]++;
          }
        });
        for (let key in stats) {
          stats[key] = {
            count: stats[key],
            percentage: ((stats[key] / totalResponses) * 100).toFixed(2)
          };
        }
        return { question: question.questionText, type: question.type, stats };
      } else if (qType === 'rating') {
        const numericAnswers = answers.filter(a => !isNaN(Number(a)));
        const total = numericAnswers.reduce((sum, a) => sum + Number(a), 0);
        const average = numericAnswers.length ? (total / numericAnswers.length).toFixed(2) : '0';
        const distribution = {};
        numericAnswers.forEach(a => {
          distribution[a] = (distribution[a] || 0) + 1;
        });
        return { question: question.questionText, type: question.type, average, distribution };
      } else if (qType === 'short_answer') {
        return {
          question: question.questionText,
          type: question.type,
          totalAnswers: answers.filter(a => a !== null).length,
          sampleAnswers: answers.filter(a => a !== null).slice(0, 5)
        };
      }
      return { question: question.questionText, type: question.type, stats: {} };
    });

    if (format === 'json') {
      const jsonData = {
        surveyTitle: survey.title,
        totalResponses,
        activityByDate,
        activitySummary,
        analytics
      };

      const filename = `${survey.title.replace(/ /g, '_')}_Analytics_${new Date().toISOString().slice(0, 10)}.json`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/json');
      return res.send(JSON.stringify(jsonData, null, 2));
    } else if (format === 'csv') {
      const { filename, buffer } = exportToCSV(analytics, survey.title);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'text/csv');
      return res.send(buffer);
    } else {
      return res.status(400).json({ message: 'Unsupported export format' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};



const exportAnswersByQuestion = async (req, res) => {
  try {
    const { surveyId } = req.params;
    const format = req.query.format || 'csv';

    const survey = await Survey.findById(surveyId).lean();
    if (!survey) return res.status(404).json({ message: 'Survey not found' });

    const responses = await Response.find({ surveyId }).lean();

    if (format === 'json') {
      // ممكن تبعت الردود كاملة خام كـ json
      return res.json({
        surveyTitle: survey.title,
        totalAnswers: responses.length,
        responses
      });
    } else if (format === 'csv') {
      const { filename, buffer } = exportAnswersByQuestionToCSV(responses, survey);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'text/csv');
      res.send(buffer);
    } else {
      return res.status(400).json({ message: 'Unsupported export format' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get options for a specific question in a survey
const getQuestionOptions = async (req, res) => {
  try {
    const { surveyId, questionId } = req.params;
    const survey = await Survey.findById(surveyId).lean();
    if (!survey) return res.status(404).json({ message: 'Survey not found' });
    const question = survey.questions.find(q => q._id.toString() === questionId);
    if (!question) return res.status(404).json({ message: 'Question not found' });
    const opts = question.Option && Array.isArray(question.Option) && question.Option.length > 0
      ? question.Option
      : (question.options && Array.isArray(question.options) ? question.options : []);
    res.json({
      questionId: question._id,
      questionText: question.questionText,
      options: opts
    });
  } catch (err) {
    console.error('Error in getQuestionOptions:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get analytics for all surveys at once
const getAllSurveysAnalytics = async (req, res) => {
  try {
    const surveys = await Survey.find().lean();
    if (!surveys.length) {
      return res.json({
        totalSurveys: 0,
        totalResponses: 0,
        surveys: []
      });
    }

    const allResponses = await Response.find().lean();
    const totalResponses = allResponses.length;

    // تحليل كل استبيان
    const surveysAnalytics = await Promise.all(surveys.map(async (survey) => {
      const surveyResponses = allResponses.filter(r => r.surveyId.toString() === survey._id.toString());
      const surveyTotalResponses = surveyResponses.length;

      // تحليل النشاط حسب التاريخ للاستبيان الواحد
      const activityByDate = {};
      surveyResponses.forEach(r => {
        const date = new Date(r.createdAt).toISOString().split('T')[0];
        activityByDate[date] = (activityByDate[date] || 0) + 1;
      });

      const activityDates = Object.keys(activityByDate).sort();
      const totalDays = activityDates.length;
      const avgResponsesPerDay = totalDays ? (surveyTotalResponses / totalDays).toFixed(2) : '0';

      let mostActiveDay = '';
      let maxResponses = 0;
      for (let date in activityByDate) {
        if (activityByDate[date] > maxResponses) {
          maxResponses = activityByDate[date];
          mostActiveDay = date;
        }
      }

      let activityLevel = 'Low';
      if (avgResponsesPerDay >= 10) activityLevel = 'High';
      else if (avgResponsesPerDay >= 4) activityLevel = 'Medium';

      // تحليل الأسئلة
      const questionsAnalytics = survey.questions.map((question) => {
        const answers = surveyResponses.map(response => {
          const match = response.answers.find(a => a.questionId.toString() === question._id.toString());
          return match ? match.answer : null;
        });

        if ((question.type === 'mcq' || question.type === 'checkbox')) {
          const opts = question.Option && Array.isArray(question.Option) && question.Option.length > 0
            ? question.Option
            : (question.options && Array.isArray(question.options) ? question.options : []);
          const optionStats = {};
          const validAnswers = answers.filter(ans => ans !== null);
          const totalAnswered = validAnswers.length;

          opts.forEach(option => {
            optionStats[option] = { count: 0, percentage: "0.00%" };
          });

          validAnswers.forEach(answer => {
            if (question.type === 'mcq') {
              if (optionStats.hasOwnProperty(answer)) {
                optionStats[answer].count += 1;
              }
            } else if (question.type === 'checkbox' && Array.isArray(answer)) {
              answer.forEach(opt => {
                if (optionStats.hasOwnProperty(opt)) {
                  optionStats[opt].count += 1;
                }
              });
            }
          });

          Object.keys(optionStats).forEach(option => {
            const count = optionStats[option].count;
            const percentage = totalAnswered > 0 ? ((count / totalAnswered) * 100).toFixed(2) : "0.00";
            optionStats[option].percentage = `${percentage}%`;
          });

          return {
            questionId: question._id,
            question: question.questionText,
            type: question.type,
            totalAnswered,
            totalSkipped: surveyTotalResponses - totalAnswered,
            stats: optionStats
          };
        } else if (question.type === 'rating') {
          const numericAnswers = answers.filter(a => !isNaN(Number(a)));
          const total = numericAnswers.reduce((sum, a) => sum + Number(a), 0);
          const average = numericAnswers.length ? (total / numericAnswers.length).toFixed(2) : '0';

          const distribution = {};
          numericAnswers.forEach(a => {
            distribution[a] = (distribution[a] || 0) + 1;
          });

          return {
            questionId: question._id,
            question: question.questionText,
            type: question.type,
            average,
            distribution
          };
        } else if (question.type === 'text') {
          const validAnswers = answers.filter(a => a !== null && a !== '');
          return {
            questionId: question._id,
            question: question.questionText,
            type: question.type,
            totalAnswers: validAnswers.length,
            sampleAnswers: validAnswers
          };
        }

        return {
          questionId: question._id,
          question: question.questionText,
          type: question.type,
          stats: {}
        };
      });

      return {
        surveyId: survey._id,
        surveyTitle: survey.title,
        surveyDescription: survey.description,
        surveyStatus: survey.status,
        totalResponses: surveyTotalResponses,
        totalQuestions: survey.questions.length,
        activityByDate,
        activitySummary: {
          totalDays,
          avgResponsesPerDay,
          mostActiveDay,
          maxResponsesOnMostActiveDay: maxResponses,
          activityLevel
        },
        questionsAnalytics
      };
    }));

    // إحصائيات عامة
    const overallStats = {
      totalSurveys: surveys.length,
      totalResponses,
      activeSurveys: surveys.filter(s => s.status === 'open').length,
      closedSurveys: surveys.filter(s => s.status === 'closed').length,
      averageResponsesPerSurvey: surveys.length ? (totalResponses / surveys.length).toFixed(2) : '0',
      mostActiveSurvey: surveysAnalytics.reduce((max, survey) => 
        survey.totalResponses > max.totalResponses ? survey : max, surveysAnalytics[0] || { totalResponses: 0 }
      )
    };

    res.json({
      overallStats,
      surveys: surveysAnalytics
    });

  } catch (err) {
    console.error('Error in getAllSurveysAnalytics:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Export all surveys analytics to CSV
const exportAllSurveysAnalytics = async (req, res) => {
  try {
    const surveys = await Survey.find().lean();
    if (!surveys.length) {
      return res.status(404).json({ message: 'No surveys found' });
    }

    const allResponses = await Response.find().lean();
    const totalResponses = allResponses.length;

    // تحليل كل استبيان
    const surveysAnalytics = await Promise.all(surveys.map(async (survey) => {
      const surveyResponses = allResponses.filter(r => r.surveyId.toString() === survey._id.toString());
      const surveyTotalResponses = surveyResponses.length;

      // تحليل النشاط حسب التاريخ للاستبيان الواحد
      const activityByDate = {};
      surveyResponses.forEach(r => {
        const date = new Date(r.createdAt).toISOString().split('T')[0];
        activityByDate[date] = (activityByDate[date] || 0) + 1;
      });

      const activityDates = Object.keys(activityByDate).sort();
      const totalDays = activityDates.length;
      const avgResponsesPerDay = totalDays ? (surveyTotalResponses / totalDays).toFixed(2) : '0';

      let mostActiveDay = '';
      let maxResponses = 0;
      for (let date in activityByDate) {
        if (activityByDate[date] > maxResponses) {
          maxResponses = activityByDate[date];
          mostActiveDay = date;
        }
      }

      let activityLevel = 'Low';
      if (avgResponsesPerDay >= 10) activityLevel = 'High';
      else if (avgResponsesPerDay >= 4) activityLevel = 'Medium';

      // تحليل الأسئلة
      const questionsAnalytics = survey.questions.map((question) => {
        const answers = surveyResponses.map(response => {
          const match = response.answers.find(a => a.questionId.toString() === question._id.toString());
          return match ? match.answer : null;
        });

        if ((question.type === 'mcq' || question.type === 'checkbox')) {
          const opts = question.Option && Array.isArray(question.Option) && question.Option.length > 0
            ? question.Option
            : (question.options && Array.isArray(question.options) ? question.options : []);
          const optionStats = {};
          const validAnswers = answers.filter(ans => ans !== null);
          const totalAnswered = validAnswers.length;

          opts.forEach(option => {
            optionStats[option] = { count: 0, percentage: "0.00%" };
          });

          validAnswers.forEach(answer => {
            if (question.type === 'mcq') {
              if (optionStats.hasOwnProperty(answer)) {
                optionStats[answer].count += 1;
              }
            } else if (question.type === 'checkbox' && Array.isArray(answer)) {
              answer.forEach(opt => {
                if (optionStats.hasOwnProperty(opt)) {
                  optionStats[opt].count += 1;
                }
              });
            }
          });

          Object.keys(optionStats).forEach(option => {
            const count = optionStats[option].count;
            const percentage = totalAnswered > 0 ? ((count / totalAnswered) * 100).toFixed(2) : "0.00";
            optionStats[option].percentage = `${percentage}%`;
          });

          return {
            questionId: question._id,
            question: question.questionText,
            type: question.type,
            totalAnswered,
            totalSkipped: surveyTotalResponses - totalAnswered,
            stats: optionStats
          };
        } else if (question.type === 'rating') {
          const numericAnswers = answers.filter(a => !isNaN(Number(a)));
          const total = numericAnswers.reduce((sum, a) => sum + Number(a), 0);
          const average = numericAnswers.length ? (total / numericAnswers.length).toFixed(2) : '0';

          const distribution = {};
          numericAnswers.forEach(a => {
            distribution[a] = (distribution[a] || 0) + 1;
          });

          return {
            questionId: question._id,
            question: question.questionText,
            type: question.type,
            average,
            distribution
          };
        } else if (question.type === 'text') {
          const validAnswers = answers.filter(a => a !== null && a !== '');
          return {
            questionId: question._id,
            question: question.questionText,
            type: question.type,
            totalAnswers: validAnswers.length,
            sampleAnswers: validAnswers
          };
        }

        return {
          questionId: question._id,
          question: question.questionText,
          type: question.type,
          stats: {}
        };
      });

      return {
        surveyId: survey._id,
        surveyTitle: survey.title,
        surveyDescription: survey.description,
        surveyStatus: survey.status,
        totalResponses: surveyTotalResponses,
        totalQuestions: survey.questions.length,
        activityByDate,
        activitySummary: {
          totalDays,
          avgResponsesPerDay,
          mostActiveDay,
          maxResponsesOnMostActiveDay: maxResponses,
          activityLevel
        },
        questionsAnalytics
      };
    }));

    // إحصائيات عامة
    const overallStats = {
      totalSurveys: surveys.length,
      totalResponses,
      activeSurveys: surveys.filter(s => s.status === 'open').length,
      closedSurveys: surveys.filter(s => s.status === 'closed').length,
      averageResponsesPerSurvey: surveys.length ? (totalResponses / surveys.length).toFixed(2) : '0',
      mostActiveSurvey: surveysAnalytics.reduce((max, survey) => 
        survey.totalResponses > max.totalResponses ? survey : max, surveysAnalytics[0] || { totalResponses: 0 }
      )
    };

    // إنشاء CSV شامل
    const csvData = [];

    // إضافة الإحصائيات العامة
    csvData.push({
      'Section': 'OVERALL STATISTICS',
      'Metric': 'Total Surveys',
      'Value': overallStats.totalSurveys,
      'Details': ''
    });
    csvData.push({
      'Section': 'OVERALL STATISTICS',
      'Metric': 'Total Responses',
      'Value': overallStats.totalResponses,
      'Details': ''
    });
    csvData.push({
      'Section': 'OVERALL STATISTICS',
      'Metric': 'Active Surveys',
      'Value': overallStats.activeSurveys,
      'Details': ''
    });
    csvData.push({
      'Section': 'OVERALL STATISTICS',
      'Metric': 'Closed Surveys',
      'Value': overallStats.closedSurveys,
      'Details': ''
    });
    csvData.push({
      'Section': 'OVERALL STATISTICS',
      'Metric': 'Average Responses Per Survey',
      'Value': overallStats.averageResponsesPerSurvey,
      'Details': ''
    });
    csvData.push({
      'Section': 'OVERALL STATISTICS',
      'Metric': 'Most Active Survey',
      'Value': overallStats.mostActiveSurvey.surveyTitle,
      'Details': `${overallStats.mostActiveSurvey.totalResponses} responses`
    });

    // إضافة سطر فارغ
    csvData.push({
      'Section': '',
      'Metric': '',
      'Value': '',
      'Details': ''
    });

    // إضافة تفاصيل كل استبيان
    surveysAnalytics.forEach(survey => {
      // معلومات الاستبيان الأساسية
      csvData.push({
        'Section': 'SURVEY DETAILS',
        'Metric': 'Survey Title',
        'Value': survey.surveyTitle,
        'Details': survey.surveyDescription || ''
      });
      csvData.push({
        'Section': 'SURVEY DETAILS',
        'Metric': 'Survey Status',
        'Value': survey.surveyStatus,
        'Details': ''
      });
      csvData.push({
        'Section': 'SURVEY DETAILS',
        'Metric': 'Total Responses',
        'Value': survey.totalResponses,
        'Details': ''
      });
      csvData.push({
        'Section': 'SURVEY DETAILS',
        'Metric': 'Total Questions',
        'Value': survey.totalQuestions,
        'Details': ''
      });
      csvData.push({
        'Section': 'SURVEY DETAILS',
        'Metric': 'Activity Level',
        'Value': survey.activitySummary.activityLevel,
        'Details': ''
      });
      csvData.push({
        'Section': 'SURVEY DETAILS',
        'Metric': 'Average Responses Per Day',
        'Value': survey.activitySummary.avgResponsesPerDay,
        'Details': ''
      });
      csvData.push({
        'Section': 'SURVEY DETAILS',
        'Metric': 'Most Active Day',
        'Value': survey.activitySummary.mostActiveDay,
        'Details': `${survey.activitySummary.maxResponsesOnMostActiveDay} responses`
      });

      // إضافة سطر فارغ
      csvData.push({
        'Section': '',
        'Metric': '',
        'Value': '',
        'Details': ''
      });

      // تفاصيل الأسئلة
      survey.questionsAnalytics.forEach(question => {
        csvData.push({
          'Section': 'QUESTION ANALYTICS',
          'Metric': 'Question',
          'Value': question.question,
          'Details': `Type: ${question.type}`
        });

        if (question.type === 'mcq' || question.type === 'checkbox') {
          csvData.push({
            'Section': 'QUESTION ANALYTICS',
            'Metric': 'Total Answered',
            'Value': question.totalAnswered,
            'Details': ''
          });
          csvData.push({
            'Section': 'QUESTION ANALYTICS',
            'Metric': 'Total Skipped',
            'Value': question.totalSkipped,
            'Details': ''
          });

          // إحصائيات الخيارات
          Object.entries(question.stats).forEach(([option, stats]) => {
            csvData.push({
              'Section': 'QUESTION ANALYTICS',
              'Metric': `Option: ${option}`,
              'Value': stats.count,
              'Details': stats.percentage
            });
          });
        } else if (question.type === 'rating') {
          csvData.push({
            'Section': 'QUESTION ANALYTICS',
            'Metric': 'Average Rating',
            'Value': question.average,
            'Details': ''
          });

          // توزيع التقييمات
          Object.entries(question.distribution).forEach(([score, count]) => {
            csvData.push({
              'Section': 'QUESTION ANALYTICS',
              'Metric': `Rating ${score}`,
              'Value': count,
              'Details': ''
            });
          });
        } else if (question.type === 'text') {
          csvData.push({
            'Section': 'QUESTION ANALYTICS',
            'Metric': 'Total Text Answers',
            'Value': question.totalAnswers,
            'Details': ''
          });
          csvData.push({
            'Section': 'QUESTION ANALYTICS',
            'Metric': 'Sample Answers',
            'Value': question.sampleAnswers.join(' | '),
            'Details': ''
          });
        }

        // إضافة سطر فارغ بين الأسئلة
        csvData.push({
          'Section': '',
          'Metric': '',
          'Value': '',
          'Details': ''
        });
      });

      // إضافة سطر فارغ بين الاستبيانات
      csvData.push({
        'Section': '',
        'Metric': '',
        'Value': '',
        'Details': ''
      });
    });

    const parser = new Parser();
    const csv = parser.parse(csvData);
    const buffer = Buffer.from(csv, 'utf-8');

    const now = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `All_Surveys_Complete_Analytics_${now}.csv`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'text/csv');
    res.send(buffer);

  } catch (err) {
    console.error('Error in exportAllSurveysAnalytics:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  getAnalytics,
  exportAnalytics,
  exportAnswersByQuestion,
  getQuestionOptions,
  getAllSurveysAnalytics,
  exportAllSurveysAnalytics
};
