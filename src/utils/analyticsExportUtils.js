const { Parser } = require('json2csv');

// تصدير تحليلات (إحصاءات) بصيغة CSV
function exportToCSV(analytics, surveyTitle) {
  const flatData = [];

  analytics.forEach(question => {
    const { questionText, type, stats, average, distribution, totalAnswers, sampleAnswers } = question;

    if ((type === 'multiple_choice' || type === 'single_choice') && stats) {
      Object.entries(stats).forEach(([option, values]) => {
        flatData.push({
          Question: questionText,
          Type: type,
          Option: option,
          Count: values.count,
          Percentage: values.percentage // كنسبة رقمية فقط، بدون %
        });
      });
    } else if (type === 'rating' && distribution) {
      Object.entries(distribution).forEach(([score, count]) => {
        flatData.push({
          Question: questionText,
          Type: type,
          Score: score,
          Count: count,
          Average: average
        });
      });
    } else if (type === 'short_answer') {
      flatData.push({
        Question: questionText,
        Type: type,
        TotalAnswers: totalAnswers,
        SampleAnswers: Array.isArray(sampleAnswers) ? sampleAnswers.join(' | ') : ''
      });
    }
  });

  const parser = new Parser();
  const csv = parser.parse(flatData);
  const buffer = Buffer.from(csv, 'utf-8');

  const now = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${surveyTitle.replace(/ /g, '_')}_Analytics_${now}.csv`;

  return { filename, buffer };
}

// تصدير الردود، كل صف رد كامل لكل شخص (وقت الإرسال + إجابات الأسئلة)
function exportAnswersByQuestionToCSV(responses, survey) {
  const questions = survey.questions;
  const csvData = [];

  responses.forEach(response => {
    const row = {
      'Submitted At': new Date(response.createdAt).toISOString().replace('T', ' ').split('.')[0]
    };

    questions.forEach(question => {
      const ans = response.answers.find(a => a.questionId.toString() === question._id.toString());
      let value = '';
      if (ans) {
        value = Array.isArray(ans.answer) ? ans.answer.join(', ') : ans.answer;
      }
      row[question.questionText] = value;
    });

    csvData.push(row);
  });

  const parser = new Parser({ fields: ['Submitted At', ...questions.map(q => q.questionText)] });
  const csv = parser.parse(csvData);
  const buffer = Buffer.from(csv, 'utf-8');

  const now = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${survey.title.replace(/ /g, '_')}_AnswersByUser_${now}.csv`;

  return { filename, buffer };
}

module.exports = {
  exportToCSV,
  exportAnswersByQuestionToCSV
};
