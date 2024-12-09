const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");



const addProductInfo = async (req, res) => {
  try {
    const category = await Category.find({ isActive: true });
    
    return res.render("product-form", {
      categ: category,
    });
  } catch (error) {
    console.error("ERROR IN ADD-PRODUCT INFO FN", error);
    return res.status(500).json({ message: "Failed to fetch product info." });
  }
};


const addProduct = async (req, res) => {
  try {
    console.log("Entered the addProduct function");
    const { productName, description, regularPrice, promotionalPrice, category } = req.body;
    const productImages = [
      ...(req.files.image1 || []),
      ...(req.files.image2 || []),
      ...(req.files.image3 || [])
    ];

    if (!productName || !description || !regularPrice || !category) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (isNaN(regularPrice) || isNaN(promotionalPrice)) {
      return res.status(400).json({ message: "Prices must be valid numbers." });
    }

    if (!productImages || productImages.length === 0) {
      return res.status(400).json({ message: "At least one image is required." });
    }
      
    const allowedTypes = ['image/jpeg', 'image/png','image/jpg'];
    const imagePaths = [];
    for (let image of productImages) {
      if (!allowedTypes.includes(image.mimetype)) {
        return res.status(400).json({ message: "Invalid image type. Only JPG and PNG are allowed." });
      }

      const fileName = image.filename;
      const filePath = path.join(__dirname, "../../public/images/products", fileName);

      await sharp(image.path)
        .resize(500, 500)
        .toFile(filePath);
      imagePaths.push(filePath);
    }

    const newProduct = new Product({
      productName,
      productDescription: description,
      regularPrice,
      promotionalPrice,
      category,
      images: imagePaths,
    });


    await newProduct.save();
    return res.status(200).json({ message: "Product added successfully!" });

  } catch (error) {
    console.error("Error in addProduct:", error);
    return res.status(500).json({ message: "Failed to add product.", error });
  }
};

const productsInfo = async(req,res)=>{
  try {
    const search=req.query.search || ""
    const page = req.query.page || 1
    const limit = 3

    const productData = await Product.find({productName:{$regex: new RegExp(".*" +search+ ".*" , "i")}})
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate("category")
    .exec()

    const count = await Product.find({productName:{$regex: new RegExp(".*" +search+ ".*" , "i")}})
    .countDocuments()

    const category = await Category.find({isActive:true})

    if(category){
      return res.render("product_list",{
        data: productData,
        currentPage: page,
        totalPages: Math.ceil(count/limit),
        cat:category,
      })
    }
  } catch (error) {
    console.error("ERROR IN PRODUCT INFO PAGE: ",error)
    res.redirect("/admin/pageerror")
  }
}

module.exports = {
  addProductInfo,
  addProduct,
  productsInfo
};