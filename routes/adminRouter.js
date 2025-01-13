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

// router.post("/salesReport",adminAuth,adminController.salesReportList)

// Customer Mgt
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
// router.post("/addCatOffer/:categoryId",adminAuth,categoryController.addCategoryOffer)

//Product Mgt
router.get("/addProduct", adminAuth, productController.addProductInfo);
router.post("/addProduct",upload, adminAuth, productController.addProduct);  
router.get("/products",adminAuth,productController.productsInfo)
router.post("/addProductOffer",adminAuth,productController.addProductOffer)
router.post("/removeProductOffer",adminAuth,productController.removeProductOffer)
router.put("/toggle-product-status/:id",adminAuth,productController.productStatus)
router.get("/editProduct/:id",adminAuth,productController.productEditInfo)
router.post("/editProduct/:id",upload,adminAuth, productController.productEdit)
router.delete("/deleteSize/:id",adminAuth,productController.deleteSize)

//Order Mgt
router.get("/orderlist",adminAuth,productController.orderListInfo)
router.get('/download-sales-report/:format',adminAuth,productController.downloadSalesReport)
// router.get("/filterOrderList",adminAuth,productController.filteredList)
// router.get("/salesReport",adminAuth,productController.orderListInfo)
router.get("/orderDetail/:orderId",adminAuth,productController.orderDetailInfo)
router.post("/order/status/:orderId",adminAuth,productController.orderStatus)
router.post("/order/return/approve/:orderId", adminController.approveReturn);
router.post("/order/return/deny/:orderId", adminController.denyReturn);

//Stock Mgt
router.get("/stockList",adminAuth,productController.stockListInfo)
router.post("/updateStock",adminAuth,productController.stockUpdate)

//Coupon Mgt
router.get("/couponList",adminAuth,productController.couponList)
router.post("/addCoupon",adminAuth,productController.addCoupon)
router.get('/activateCouponStatus/:id',adminAuth,productController.activateCouponStatus)
router.get('/inactivateCouponStatus/:id',adminAuth,productController.inactivateCouponStatus)

module.exports = router



