const User = require("../../models/userSchema")
const Product = require("../../models/productSchema")
const Category = require("../../models/categorySchema")
const Address = require("../../models/addressSchema")
const env = require("dotenv").config()
const bcrypt = require("bcrypt")
const nodemailer = require("nodemailer")
const mongoose = require('mongoose');


const userProfileInfo = async(req,res)=>{
    try {
       const user = req.session.user

       if(!user){
        return console.log(`USER DOES NOT EXIST !!!`)
       }

       const userData = await User.findById(user)

       res.render("profile",{user:userData})

    } catch (error) {
        console.error("ERROR LOADING USER FN",error)
    }
}

const userProfile = async(req,res)=>{
    try {
        const {name,email,oldPassword,newPassword} = req.body

        const user = await User.findOne({email})

        if(user){
            
            if(oldPassword && newPassword){
                const isPasswordMatch = await bcrypt.compare(oldPassword, user.password);

            if (!isPasswordMatch) {
                return res.status(400).json({
                    success: false,
                    message: "Old Password is incorrect !!!",
                });
            }

            const salt = await bcrypt.genSalt(10); 
            const hashedPassword = await bcrypt.hash(newPassword, salt); 
            user.password = hashedPassword; 

            }

            user.name = name
            await user.save()
            
            return res.status(200).json({success:true,message:"Profile Updated successfully..."})
        }
    } catch (error) {
        console.error("ERROR IN USER PROFILE FN",error)
    }
}

module.exports = {
    userProfileInfo,
    userProfile
}
