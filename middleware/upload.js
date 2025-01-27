const multer = require('multer');
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");


const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "products", 
    format: async (req, file) => "png", 
    public_id: (req, file) => `product-${Date.now()}`, 
  },
});

const upload = multer({ storage: cloudinaryStorage }).fields([
  { name: 'image1' },
  { name: 'image2' },
  { name: 'image3' }
]);

module.exports = upload;