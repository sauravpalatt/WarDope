
const User = require("../../models/userSchema")
const Product = require("../../models/productSchema")
const Category = require("../../models/categorySchema")
const env = require("dotenv").config()
const bcrypt = require("bcrypt")
const nodemailer = require("nodemailer")
const mongoose = require('mongoose');

const pageNotFound = async(req,res)=>{
    try {
        res.render("page_404")
        
    } catch (error) {
      res.redirect("/pagenotfound")  
    }
}

const loadHomePage = async (req, res) => {
    try {
        const user = req.session.user;

        const categories= await Category.find({isActive:true})
        let productData = await Product.find({
            isBlocked:false,
            category: {$in:categories.map(category=>category._id)},
        })

        productData.sort((a,b)=>new Date(b.createdOn)-new Date(a.createdOn))
        productData = productData.slice(0,4)

        if (user) {
            let userData = await User.findOne({ _id: new mongoose.Types.ObjectId(user._id) });
            return res.render("home", { user: userData, product:productData});

        } else {
            return res.render("home",{ product:productData,category:categories});
        }
    } catch (error) {
        console.error("Home page not rendered:", error);
        res.status(500).send("Home page error occurred");
    }
};


const signUpLoader = async(req,res)=>{
 try {
    return res.render("signup")
 } catch (error) {
    console.log("Sign up page load error",error)
    res.status(404).send("Sign up page not rendered")
 }
}

const logInLoader = async(req,res)=>{
        try {
        if(req.session.user){
            return res.redirect("/")
        }else{
            return res.render("login")
        }    
        }catch (error) {
            console.log("Log In Error",error)
            return res.redirect("/pageNotFound")
        }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const findUser = await User.findOne({ isAdmin: false, email: email });

        if (!findUser) {
            console.log("User not found.");
           return res.json({success:false,message:"User not found"})
        }

        if (findUser.isBlocked) {
            console.log("User is blocked.");
            return res.json({success:false,message:"User is blocked by admin"})
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password);
        if (!passwordMatch) {
            console.log("Incorrect password.");
            return res.json({success:false,message: "Incorrect Password" });
        }

        req.session.user = { _id: findUser._id };
        return res.status(200).json({success:true,message:"Login successful"})
        
    } catch (error) {
        console.error("Error during login:", error.message, error.stack);
        res.status(500).redirect("/pagenotfound")
    }
};

function generateOtp(){
    return Math.floor(100000+Math.random()*900000).toString()
}

async function sendVerificationEmail(email,otp){ 
    try {
        const transporter = nodemailer.createTransport({
            service:"gmail",
            port: 587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })

        const info = await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Verify your account",
            text: `Your otp is ${otp}`,
            html:`<b>Your OTP: ${otp}</b>`,
        })

        return info.accepted.length >0

    } catch (error) {
        console.error("Error Sending Email",error)
        return false 
    }
}

const signUp= async(req,res)=>{
   try {
    const {name,phone,email,password,cPassword}=req.body
    if(password !== cPassword){
        return res.render("signup",{message:"Passwords do not match"})
    } 

    const findUser = await User.findOne({email})

    if(findUser){
        return res.render("signup",{message:"User already exists"})
    }

    const otp=generateOtp()
    const emailSent = await sendVerificationEmail(email,otp)

    if(!emailSent){
        return res.json("email-error")
    }

    req.session.userOtp = otp;
    req.session.userData = {name,phone,email,password}
    

    res.render("verify-otp")
    console.log("OTP Sent",otp)


   } catch (error) {
    
    console.error("signup error",error)
     res.redirect("/pageNotFound")
   }
}

const forgPasswordInfo = async (req, res) => {
    try {
        
        if (req.session.user) {
            return res.redirect("/");
        }
        res.render("forgot_password");
    } catch (error) {
        console.error("ERROR IN PAGE FORGOT PASSWORD", error);   
    }
};

const forgPassword = async (req, res) => {
    try {
      const { emailId } = req.body;
  
      const user = await User.findOne({ email: emailId });
      if (!user) {
        return res.status(404).json({ success: false, message: "Email not found in our records." });
      }
  
      const otpRandom = generateOtp();

      console.log(`OTP for resend: ${otpRandom}`)
  
      req.session.otp = otpRandom;
      req.session.userId = user._id;
  
      const emailSent = await sendVerificationEmail(emailId, otpRandom);
      if (!emailSent) {
        return res.status(500).json({ success: false, message: "Failed to send OTP. Please try again." });
      }
  
      return res.status(200).json({ success: true, message: "OTP has been sent to your email address." });
    } catch (error) {
      console.error("Error in Forgot Password Function:", error);
      return res.status(500).json({ success: false, message: "Internal Server Error. Please try again later." });
    }
  };

const verifyOtpPwd = async (req, res) => {
    try {
        const { otp } = req.body;
        const otpSession = req.session.otp;

        console.log(`OTP FROM REQ.BODY ${typeof otp} & OTP FROM SESSION ${typeof otpSession}`)

        if (otp !== otpSession) {
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }
       
        res.status(200).json({success:true, message: "OTP Verified successfully"})

    } catch (error) {
        console.error("ERROR IN VERIFY OTP PWD", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const changePwdInfo = async(req,res)=>{
    try {
        if(req.session.userId){
         return res.render("changePassword")
        }
        console.log("User Not Found")
        
    } catch (error) {
        console.error("ERROR IN LOADING CHANGE PWD INFO",error)  
    }
}

  const changePwd = async (req, res) => {
    try {
      const { newPassword } = req.body;
  
      if (!newPassword) {
        return res.status(400).json({ success: false, message: "Password is required" });
      }
  
      const userId = req.session.userId;
  
      if (!userId) {
        return res.status(401).json({ success: false, message: "User not authenticated" });
      }
  
      const hashedPassword = await bcrypt.hash(newPassword, 10);
  
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { password: hashedPassword },
        { new: true }
      );
  
      if (!updatedUser) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
  
      req.session.destroy();
  
      res.status(200).json({ success: true, message: "Password updated successfully" });

    } catch (error) {
      console.error("ERROR IN CHANGEPWD FUNCTION", error);
      return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  };

const securePassword = async (password)=>{
    try {
        const passwordHash = await bcrypt.hash(password,10)
        return passwordHash
    } catch (error) {
        console.error("Password hashing error",error)
    }
}

const verifyOtp= async(req,res)=>{
    try {
        const {otp} = req.body
        if(otp === req.session.userOtp){
            const user =  req.session.userData
            const passwordHash = await securePassword(user.password)

            const saveUserData = new User ({
                name:user.name,
                email:user.email,
                phone:user.phone,
                password:passwordHash
            })

            await saveUserData.save()
            req.session.user = saveUserData._id;

            res.json({success:true, redirectUrl:"/"})
        }else{
            res.status(400).json({success:false,message:"Invalid OTP, Please Try Again"})
        }
    } catch (error) {
            console.error("Error Verifying OTP",error)
            res.status(500).json({success:false,message:"An Error Occured"})
    }
}

const resendOtp= async(req,res)=>{
    try {
        const {email} = req.session.userData
        if(!email){
           return res.status(400).json({success:false,message:"Email not found in session"})       
    }
    const otp = generateOtp()
    req.session.userOtp = otp
    console.log(`RESEND OTP: ${req.session.userOtp}`)
    
    const emailSent = await sendVerificationEmail(email,otp)
    if(emailSent){
        res.status(200).json({success:true,message:"OTP Resend Successfully"})
    }else{
        res.status(400).json({success:false,message:"Failed to sed OTP,Please try again"})
    }
    } catch (error){
        console.log("Error Sending OTP",error)
        res.status(500).json({success:false,message:"Internal Server Error.Please Try Again"})
    }
}

const logout=async(req,res)=>{

    req.session.destroy((err)=>{

        if(err){
            console.log("Error in destroying session")
            return res.status(500).send({message:"Session can't be destroyed"})
        }else{
            res.redirect("/login")
        }
    })
}

const productDetailInfo = async(req,res)=>{
   
    try {
        const user = req.session.user
        const {id} = req.params; 
        const product = await Product.findById(id)

        if(product){
           
            return res.render("product_detail",{user,product:product})
        }else{
            console.log("Product does not exist...")
        } 
          
    } catch (error) {
      console.error("ERROR IN PRODUCT DETAIL INFO",error)  
    }
}

const productList = async (req, res) => {
    try {
        const user = req.session.user;

        const categories = await Category.find({ isActive: true });

        let sortOption = req.query.sort;
        let sortCriteria = {};

        if (sortOption === 'latest') {
            sortCriteria = { createdAt: -1 };  
        } else if (sortOption === 'lowToHigh') {
            sortCriteria = { promotionalPrice: 1 };  
        } else if (sortOption === 'highToLow') {
            sortCriteria = { promotionalPrice: -1 };  
        }

        let searchTerm = req.query.search || '';  

        let filterCriteria = {
            isBlocked: false,
            category: { $in: categories.map(category => category._id) },
        };

        if (searchTerm) {
            filterCriteria.productName = { $regex: searchTerm, $options: 'i' }; 
        }

        let minPrice = 0;
        let maxPrice = 2000;

        if (req.query.minPrice || req.query.maxPrice) {
            minPrice = req.query.minPrice ? parseInt(req.query.minPrice) : 0;
            maxPrice = req.query.maxPrice ? parseInt(req.query.maxPrice) : 2000;

            filterCriteria.promotionalPrice = { $gte: minPrice, $lte: maxPrice };
        }

        let productData = await Product.find(filterCriteria).sort(sortCriteria); 

        if (user) {
            let userData = await User.findOne({ _id: new mongoose.Types.ObjectId(user._id) });
            return res.render("product-listUser", { user: userData, product: productData, search: searchTerm, minPrice, maxPrice });
        } else {
            return res.render("product-listUser", { product: productData, search: searchTerm, minPrice, maxPrice });
        }

    } catch (error) {
        console.error("ERROR IN PRODUCT LIST FN", error);
        res.status(500).send('Server Error');
    }
};


module.exports=
   {
    loadHomePage,
    pageNotFound,
    signUpLoader,
    signUp,
    logInLoader,
    verifyOtp,
    resendOtp,
    login,
    logout,
    productDetailInfo,
    productList,
    forgPasswordInfo,
    forgPassword,
    changePwdInfo,
    changePwd,
    verifyOtpPwd
  }