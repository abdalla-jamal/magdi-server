// controllers/adminController.js
const Admin = require('../models/adminModel');
const Survey = require('../models/SurveyModel'); 
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// login
exports.loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'الرجاء إدخال البريد الإلكتروني وكلمة المرور' });
  }

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: 'البريد الإلكتروني غير موجود' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'كلمة المرور غير صحيحة' });
    }

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      success: true,
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (err) {
    console.error('خطأ في تسجيل الدخول:', err);
    res.status(500).json({ message: 'حدث خطأ في السيرفر', error: err.message });
  }
};

// إنشاء أدمن جديد (للسوبر أدمن فقط)
exports.createAdmin = async (req, res) => {
  try {
    const { email, password, role = 'admin' } = req.body;

    // التحقق من وجود البريد الإلكتروني
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'البريد الإلكتروني مستخدم بالفعل' });
    }

    // إنشاء أدمن جديد
    const admin = await Admin.create({
      email,
      password,
      role
    });

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الأدمن بنجاح',
      admin: {
        id: admin._id,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (err) {
    console.error('خطأ في إنشاء أدمن:', err);
    res.status(500).json({ message: 'حدث خطأ في السيرفر', error: err.message });
  }
};

// عرض قائمة الأدمن (للسوبر أدمن فقط)
exports.listAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select('-password');
    res.status(200).json({
      success: true,
      admins
    });
  } catch (err) {
    console.error('خطأ في عرض قائمة الأدمن:', err);
    res.status(500).json({ message: 'حدث خطأ في السيرفر', error: err.message });
  }
};

// حذف أدمن (للسوبر أدمن فقط)
exports.deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    
    if (!admin) {
      return res.status(404).json({ message: 'الأدمن غير موجود' });
    }

    // منع حذف السوبر أدمن
    if (admin.role === 'super_admin') {
      return res.status(403).json({ message: 'لا يمكن حذف السوبر أدمن' });
    }

    await Admin.deleteOne({ _id: req.params.id });
    res.status(200).json({
      success: true,
      message: 'تم حذف الأدمن بنجاح'
    });
  } catch (err) {
    console.error('خطأ في حذف الأدمن:', err);
    res.status(500).json({ message: 'حدث خطأ في السيرفر', error: err.message });
  }
};

// تغيير كلمة المرور
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.admin.id);

    // التحقق من كلمة المرور الحالية
    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'كلمة المرور الحالية غير صحيحة' });
    }

    // تحديث كلمة المرور
    admin.password = newPassword;
    await admin.save();

    res.status(200).json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح'
    });
  } catch (err) {
    console.error('خطأ في تغيير كلمة المرور:', err);
    res.status(500).json({ message: 'حدث خطأ في السيرفر', error: err.message });
  }
};

// change survey status
exports.updateSurveyStatus = async (req, res) => {
  const surveyId = req.params.id;
  const { status } = req.body;

  if (!['open', 'closed'].includes(status)) {
    return res.status(400).json({ message: 'حالة الاستبيان يجب أن تكون "open" أو "closed"' });
  }

  try {
    const survey = await Survey.findById(surveyId);
    
    if (!survey) {
      return res.status(404).json({ message: 'الاستبيان غير موجود' });
    }

    survey.status = status;
    await survey.save();

    res.status(200).json({
      success: true,
      message: 'تم تحديث حالة الاستبيان بنجاح',
      survey
    });
  } catch (err) {
    console.error('خطأ في تحديث حالة الاستبيان:', err);
    res.status(500).json({ message: 'حدث خطأ في السيرفر', error: err.message });
  }
};

// تسجيل الخروج
exports.logoutAdmin = async (req, res) => {
  try {
    // في حالة استخدام قائمة التوكنات المحظورة
    // يمكن إضافة التوكن الحالي إلى القائمة السوداء هنا
    
    res.status(200).json({
      success: true,
      message: 'تم تسجيل الخروج بنجاح'
    });
  } catch (err) {
    console.error('خطأ في تسجيل الخروج:', err);
    res.status(500).json({ message: 'حدث خطأ في السيرفر', error: err.message });
  }
};
