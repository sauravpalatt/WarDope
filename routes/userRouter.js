const express = require("express")
const userController = require("../controllers/user/userController")
const router=express.Router()
const passport = require("passport")

router.get("/",userController.loadHomePage)
router.get("/signup",userController.signUpLoader)
router.post("/signup",userController.signUp)
router.get("/login",userController.logInLoader)
router.get("/logout",userController.logout)
router.post("/login",userController.login)
router.get("/pagenotfound",userController.pageNotFound)
router.post("/verify-otp",userController.verifyOtp)
router.post("/resend-otp",userController.resendOtp)
router.get("/auth/google",passport.authenticate("google",{scope:["profile","email"], prompt: 'select_account'}))

router.get("/auth/google/callback",passport.authenticate("google",{failureRedirect:"/signup"}),(req,res)=>{
    res.redirect("/")
})

module.exports=router