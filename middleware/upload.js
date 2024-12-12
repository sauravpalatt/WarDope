const fs = require('fs')
const multer = require('multer');
const path = require('path');


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dirPath = path.join(__dirname, "../../public/images/products");
    
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });  
    }
    cb(null, dirPath);  
  },
  filename: (req, file, cb) => {
    const fileName = `${Date.now()}.${file.originalname}`; 
    cb(null, fileName);  
  }
});

const upload = multer({storage}).fields([{ name: 'image1' }, { name: 'image2' }, { name: 'image3' }]);

module.exports = upload;