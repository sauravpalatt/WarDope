
const User = require("../../models/userSchema")
const env = require("dotenv").config()
const bcrypt = require("bcrypt")
const nodemailer = require("nodemailer")

const pageNotFound = async(req,res)=>{
    try {
        res.render("page_404")
        
    } catch (error) {
      res.redirect("/pagenotfound")  
    }
}

const loadHomePage = async(req,res)=>{
    try {
        return res.render("home")
        
    } catch (error) {
        console.log("Home page not rendered")
        res.status(500).send("home page error occured")
    }
}

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
        console.log(req.body);
        
        
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

        req.session.user = findUser._id;
        console.log("Login successful. Redirecting to home page.");
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

            console.log( req.session.user)

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

module.exports=
   {
    loadHomePage,
    pageNotFound,
    signUpLoader,
    signUp,
    logInLoader,
    verifyOtp,
    resendOtp,
    login
  }