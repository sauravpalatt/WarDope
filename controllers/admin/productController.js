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
      const filePath = path.join("images", "products", fileName); 
      await sharp(image.path)
      .resize(500, 500)
      .toFile(path.join(__dirname, "../../public", filePath)); 
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

const productEdit = async (req, res) => {
  try {
    const productId = req.params.id;

    
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    const data = req.body;

    
    const existingProduct = await Product.findOne({
      productName: data.productName,
      _id: { $ne: productId }
    });

    if (existingProduct) {
      return res.status(400).json({ success: false, message: "Another product with the same name already exists!" });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    const imagePaths = [];

    
    const productImages = [
      req.files.image1 ? req.files.image1[0] : product.images[0], 
      req.files.image2 ? req.files.image2[0] : product.images[1], 
      req.files.image3 ? req.files.image3[0] : product.images[2]
    ];

   
    for (let image of productImages) {
      if (typeof image === 'object' && !allowedTypes.includes(image.mimetype)) {
        return res.status(400).json({ message: "Invalid image type. Only JPG and PNG are allowed." });
      }

      
      if (req.files[`image${productImages.indexOf(image) + 1}`]) {
        const fileName = image.filename;
        const filePath = path.join("images", "products", fileName);
        
        
        await sharp(image.path)
          .resize(500, 500)
          .toFile(path.join(__dirname, "../../public", filePath));

        imagePaths.push(filePath);  
      } else {
       
        imagePaths.push(image);
      }
    }

    const updateFields = {
      productName: data.productName,
      category: data.category,
      regularPrice: data.regularPrice,
      promotionalPrice: data.promotionalPrice,
      images: imagePaths
    };

    const updatedProduct = await Product.findByIdAndUpdate(productId, updateFields, { new: true });

    res.status(200).json({ success: true, message: "Product updated successfully!", updatedProduct });

  } catch (error) {
    console.error("Error in productEdit function:", error);
    res.status(500).json({ success: false, message: "An error occurred while updating the product." });
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

const addProductOffer = async(req,res)=>{
  console.log("HEY FROM ADD PRODUCT OFFER FN")
  try {
      const {productId,percentage} = req.body
      console.log(typeof percentage)
      const findProduct = await Product.findById(productId)
      const findCategory = await Category.findOne({_id:findProduct.category})
      if(findCategory.categoryOffer>percentage){
        return res.json({status:false,message:"This product category already has a category offer"})
      }
      
     findProduct.promotionalPrice = Math.floor(findProduct.regularPrice * (1-percentage/100))
     console.log(percentage)
     findProduct.productOffer = parseInt(percentage)
     await findProduct.save()
     findCategory.categoryOffer=0 //CHECK THIS LATER
     await findCategory.save()
     res.json({status:true})

  } catch (error) {
      console.error("ERROR IN ADD-PRODUCT OFFER",error)
      res.redirect("admin/pageerror")
      res.status(500).json({status:false,message:"Internal Server Error"})
  }
}

const removeProductOffer = async(req,res)=>{
  try {
    const {productId} = req.body
    const findProduct = await Product.findById(productId)
    const percentage = findProduct.productOffer
    findProduct.promotionalPrice = findProduct.regularPrice
    findProduct.productOffer = 0
    await findProduct.save()
    res.json({status:true})

  } catch (error) {
    console.error("ERROR IN REMOVE-PRODUCT OFFER",error)
    res.redirect("/admin/pageerror")
  }
}

const productStatus = async(req,res)=>{
  try {
      const {id} = req.params
      const {isBlocked} = req.body

      const product = await Product.findById(id)

      if(!product){
        return res.status(400).json({success:false,message:"Product ID not found"})
      }

      product.isBlocked= isBlocked
      await product.save()

      res.status(200).json({ success: true, message: `Product has been ${isBlocked ? 'Blocked' : 'Unblocked'}` });
        
  } catch (error) {
      console.error("ERROR IN PRODUCT STATUS",error)
  }
}

const productEditInfo = async(req,res)=>{
  try {
    const id=req.params.id
    const product = await Product.findById(id)
    const category = await Category.find({})// all categories
    res.render("product-edit",{
      product:product,
      categ:category
    })

  } catch (error) {
    console.errror("ERROR OCCURED IN PRODUCT EDIT FUNCTION",error) 
  }
}

module.exports = {
  addProductInfo,
  addProduct,
  productsInfo,
  addProductOffer,
  removeProductOffer,
  productStatus,
  productEditInfo,
  productEdit
};