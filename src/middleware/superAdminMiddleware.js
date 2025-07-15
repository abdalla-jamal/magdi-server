const superAdminProtect = async (req, res, next) => {
  try {
    // التحقق من أن المستخدم أدمن أولاً (من خلال middleware السابق)
    if (!req.admin) {
      return res.status(401).json({ message: 'غير مصرح لك بالدخول' });
    }

    // التحقق من أن الأدمن هو سوبر أدمن
    if (req.admin.role !== 'super_admin') {
      return res.status(403).json({ message: 'هذه العملية متاحة فقط للسوبر أدمن' });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ في السيرفر' });
  }
};

module.exports = superAdminProtect; 