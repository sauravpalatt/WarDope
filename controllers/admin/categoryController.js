const Category = require("../../models/categorySchema")
const Product = require("../../models/productSchema")
const mongoose = require("mongoose")

const categoryInfo = async (req, res) => {
    try {
        let search = "";
        if (req.query.search) {
            search = req.query.search;
        }

        const page = parseInt(req.query.page) || 1; 
        const limit = 3; 
        const skip = (page - 1) * limit;

        const categoryData = await Category.find({
            $or: [
                { categoryName: { $regex: ".*" + search + ".*", $options: "i" } },
                { description: { $regex: ".*" + search + ".*", $options: "i" } }
            ]
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .exec();

        
        const totalCategories = await Category.find({
            $or: [
                { categoryName: { $regex: ".*" + search + ".*", $options: "i" } },
                { description: { $regex: ".*" + search + ".*", $options: "i" } }
            ]
        }).countDocuments();

        const totalPages = Math.ceil(totalCategories / limit);

        
        res.render("category", {
            data: categoryData,
            currentPage: page,
            totalPages,
            totalCategories,
            search 
        });

    } catch (error) {
        console.error("ERROR IN CATEGORY-INFO FUNCTION", error);
        res.redirect("/pageerror");
    }
};

const addCategory = async (req, res) => {
    try {
        const { catDes, offerId } = req.body;
        const catName = req.body.catName.trim().toUpperCase();
        
        const category = await Category.findOne({categoryName:catName})

        if(category){

            await Category.updateOne({categoryName:catName},{$set:{description:catDes,offerId: offerId || null}})

            res.status(200).json({ success: true, message: "Category updated successfully" });

        }else{
            const newCategory = await Category.create({
                categoryName: catName,
                description: catDes,
                offerId: offerId || null, 
            });
    
            if(newCategory){
                res.status(200).json({ success: true, message: "Category added successfully" });
            }
        }

    } catch (error) {
        console.error(error); 
        res.status(500).json({ success: false, message: "Error in addCategory function" });
    }
};

const activateUser = async (req, res) => {
    try {
        const catId = req.query.id;
        const category = await Category.findById(catId); 
        if (category) {
            category.isActive = true;  
            await category.save();
            res.redirect("/admin/categories?message=Category Is Active&type=success");
        } else {
            console.log("Category not found in activateUser fn");
        }
    } catch (error) {
        console.error("ERROR IN ACTIVATE USER FN", error);
    }
};

const inactivateUser = async (req, res) => {
    try {
        const catId = req.query.id;
        const category = await Category.findById(catId); 
        if (category) {
            category.isActive = false;  
            await category.save();
            res.redirect("/admin/categories?message=Category Is Turned InActive&type=success");
        } else {
            console.log("Category not found in inactivateUser fn");
        }
    } catch (error) {
        console.error("ERROR IN INACTIVATE USER FN", error);
    }
};
    

const editCategoryInfo = async(req,res)=>{
  try {
    const { id }= req.query
    const category = await Category.findOne({_id:id})

    if(category){
      return res.render("category-edit",{category:category})
    }

    console.log("category not found @ editCategoryInfo")

  } catch (error) {

    console.error("EDIT CATEGORY FN NOT WORKING",error)
    res.redirect("/admin/pageerror")
  }
}

const editCategory = async(req,res)=>{
    try {
        const {id} = req.body
        const {catName,catDes,offerId} = req.body

        const existingCategory = await Category.findOne({categoryName:catName})

        if(existingCategory){
           return res.status(404).json({success:false,message:"Category name already exists"})
        }

        const updateCategory = await Category.findByIdAndUpdate(id,{
        categoryName:catName,
        description:catDes,
        offerId:offerId || null
        },{new:true})
        
         res.status(200).json({success:true,message:"Category Updated Successfully"})

    } catch (error) {

        console.error("ERROR IN FUNCTION EDIT CATEGORY",error)
        res.status(500).json({success:false,message:"Internal Server Error"})

    }
}

const addCategoryOffer = async(req,res)=>{

    const { offerPercent, categoryId } = req.body;

    try {
        
        const category = await Category.findById(categoryId);

        if (!category) {
            return res.json({ success: false, message: 'Category not found' });
        }

        category.offer = offerPercent;
        await category.save();

        const products = await Product.find({ category: categoryId });

        for (let product of products) {
          const discountAmount = (product.regularPrice * offerPercent) / 100;
          product.promotionalPrice = Math.round(product.regularPrice - discountAmount);
    
          await product.save();
        }
        return res.json({
            success: true,
            message: 'Offer applied successfully'
          });

    } catch (error) {
        console.error(error);
        return res.json({ success: false, message: 'Error applying offer' });
    }
}

module.exports={
    categoryInfo,
    addCategory,
    activateUser,
    inactivateUser,
    editCategoryInfo,
    editCategory,
    addCategoryOffer
}