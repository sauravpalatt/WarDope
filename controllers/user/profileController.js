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

       const userData = await User.findOne({_id: user._id})

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

        const isPasswordMatch = await bcrypt.compare(oldPassword, user.password);

            if (!isPasswordMatch) {
                return res.status(400).json({
                    success: false,
                    message: "Password Mismatch or Empty fields",
                });
            }

            const salt = await bcrypt.genSalt(10); 
            const hashedPassword = await bcrypt.hash(newPassword, salt); 
            user.password = hashedPassword; 

            user.name = name,
            user.address = address

            await user.save()
            
            return res.status(200).json({success:true,message:"Profile Updated successfully..."})

        }else{

           const newUser = new User({name,email,password})
           await newUser.save()
           return res.status(200).json({success:true,message:"Profile Created successfully..."})

        }

    } catch (error) {

        console.error("ERROR IN USER PROFILE FN",error)
    }
}

module.exports = {
    userProfileInfo,
    userProfile
}
