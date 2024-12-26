const express = require("express")
const userController = require("../controllers/user/userController")
const profileController = require("../controllers/user/profileController")
const addressController = require("../controllers/user/addressController")
const cartController = require("../controllers/user/cartController")
const {userAuth}= require("../middleware/auth")

const router=express.Router()
const passport = require("passport")

router.get("/",userController.loadHomePage)
router.get("/signup",userController.signUpLoader)
router.post("/signup",userController.signUp)
router.get("/login",userController.logInLoader)
router.get("/logout",userController.logout)
router.post("/login",userController.login)
router.get("/forgotPassword",userController.forgPasswordInfo)
router.post("/forgotPassword",userController.forgPassword)
router.post("/verifyOtpPwd",userController.verifyOtpPwd)
router.get("/changePasswordInfo",userController.changePwdInfo)
router.post("/changePassword",userController.changePwd)
router.get("/pagenotfound",userController.pageNotFound)
router.post("/verify-otp",userController.verifyOtp)
router.post("/resend-otp",userController.resendOtp)
router.get("/auth/google",passport.authenticate("google",{scope:["profile","email"], prompt: 'select_account'}))
router.get("/auth/google/callback",passport.authenticate("google",{failureRedirect:"/signup"}),(req,res)=>{
    res.redirect("/")
})
router.get("/productDetail/:id",userController.productDetailInfo)
router.get("/productList",userController.productList)

//profile 
router.get("/userProfile",profileController.userProfileInfo)
router.post("/userProfile",profileController.userProfile)

//address
router.get("/address",addressController.addressPageInfo)
router.get("/checkout",userAuth,addressController.checkOutInfo)
router.post("/addBillingAddress",userAuth,addressController.addBillingAddress)
router.get("/addAddress",addressController.addAddressInfo)
router.post("/addAddress",addressController.addAddress)
router.get("/editAddressInfo/:id",addressController.editAddressInfo)
router.put("/editAddress/:id",addressController.editAddress)
router.delete("/deleteAddress/:id",addressController.deleteAddress)

//cart
router.post("/cart/add",userAuth,cartController.addToCart)
router.get("/cart",cartController.cartList)
router.post("/cart/update/:itemId",userAuth,cartController.updateCartQty)
router.delete("/cart/remove/:itemId",userAuth,cartController.deleteCartItem)

//order
router.post("/placeOrder",userAuth,cartController.placeOrder)
router.get("/orders",userAuth,cartController.ordersList)
router.get("/order-details/:orderId",userAuth,cartController.orderDetail)
router.put("/orders/cancel/:orderId",userAuth,cartController.cancelOrder)

module.exports=router