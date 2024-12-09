const multer = require('multer');
const path = require('path');

// Configure multer storage options
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dirPath = path.join(__dirname, "../../public/images/products");
    // Ensure the directory exists
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });  // Create directory if it doesn't exist
    }
    cb(null, dirPath);  // Save to this directory
  },
  filename: (req, file, cb) => {
    const fileName = `${Date.now()}-${file.originalname}`; // Create a unique filename
    cb(null, fileName);  // Set the file name
  }
});

// Define upload middleware with multiple files support
const upload = multer({
  storage: multer.diskStorage({ /* configuration */ }),
}).fields([{ name: 'image1' }, { name: 'image2' }, { name: 'image3' }]);

module.exports = upload;