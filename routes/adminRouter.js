const express = require ("express")
const router = express.Router()
const adminController = require("../controllers/admin/adminController")
const {adminAuth,userAuth}= require("../middleware/auth")
const customerController = require("../controllers/admin/customerController")
const categoryController = require("../controllers/admin/categoryController")
const productController = require("../controllers/admin/productController")
const upload = require('../middleware/upload'); 


router.get("/pageerror",adminController.pageerror)
//Log In Mgt
router.get("/login",adminController.loadLogin)
router.post("/login",adminController.login)
router.get("/logout",adminController.adminLogout)
router.get("/",adminAuth,adminController.loadDashboard)
//Customer Mgt
router.get("/users",adminAuth,customerController.userInfo)
router.get("/blockCustomer",adminAuth,customerController.blockUser)
router.get("/unblockCustomer",adminAuth,customerController.unblockUser)
//Category Mgt
router.get("/categories",adminAuth,categoryController.categoryInfo)
router.post("/addcategory",adminAuth,categoryController.addCategory)
router.get("/activateCategory",adminAuth,categoryController.activateUser)
router.get("/inactivateCategory",adminAuth,categoryController.inactivateUser)
router.get("/editCategory",adminAuth,categoryController.editCategoryInfo)
router.post("/editCategory/:id",adminAuth,categoryController.editCategory)
// router.post("/addOffer",adminAuth,categoryController.addOffer)
//Product Mgt
router.get("/addProduct", adminAuth, productController.addProductInfo);
router.post("/addProduct",upload, adminAuth, productController.addProduct);  
router.get("/products",adminAuth,productController.productsInfo)


module.exports = router


