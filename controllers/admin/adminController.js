const mongoose = require("mongoose")
const bcrypt = require("bcrypt")
const env = require("dotenv").config()
const User = require("../../models/userSchema")

const pageerror = (req,res)=>{
   res.render("page-error")
}

const loadLogin = (req,res) => {
    try {
        if (req.session.admin) {
            return res.redirect("/");
        }
        res.render("adm-login");
    } catch (error) {
        console.error("Error occurred in admin login rendering:", error);
        res.status(500).send("Error rendering admin login page");
    }
};

const login = async (req, res) => {
    try {
        const {email, password} = req.body;
        const Admin = await User.findOne({ isAdmin: true, email});
        
        if (Admin) {
            const passwordMatch = await bcrypt.compare(password, Admin.password);

            if (passwordMatch) {
                req.session.admin = { _id: Admin._id };
                return res.redirect("/admin");
            }else{
                return res.redirect("/admin/login")
            }   
        }else{
                return res.redirect("/admin/login")
        }

    } catch (error) {
        console.error("Error in ADMIN-LOGIN method:", error);
        res.redirect("/errorpage");
    }
};

const loadDashboard =async (req,res)=>{
    try {
        if(req.session.admin){
            return res.render("dashboard")
        }else{
            return res.redirect("/pageerror")
        }
    } catch (error) {
        console.error("Error loading Dashboard",error) 
    }
}

const adminLogout = (req,res)=>{
    req.session.destroy((err)=>{
        if(err){
            console.error("Admin-Session was not destroyed",err)
            return res.status(500).send("Admin Page Logout Error")
        }else{
            return res.redirect("/admin/login")
        }
    })
}

module.exports={
    loadLogin,
    login,
    loadDashboard,
    pageerror,
    adminLogout
}

