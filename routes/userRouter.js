const express = require("express")
const userController = require("../controllers/user/userController")
const router=express.Router()

router.get("/",userController.loadHomePage)
router.get("/signup",userController.signUpLoader)
router.get("/login",userController.logInLoader)
router.get("/pagenotfound",userController.pageNotFound)
module.exports=router