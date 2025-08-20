const path = require('path');
const multer = require('multer');

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, 'uploads/');
  },
  filename(_req, file, cb) {
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});



const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

module.exports = upload;