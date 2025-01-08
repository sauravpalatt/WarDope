
const User = require("../models/userSchema")

const userAuth = (req, res, next) => {
    if (req.session.user) {
        User.findById(req.session.user) 
            .then((data) => {
                if (data && !data.isBlocked) {
                    return next(); 
                } else {
                    return res.redirect("/login"); 
                }
            })
            .catch((error) => {
                console.error("Error in user-auth middleware", error);
                res.status(500).send("Internal Server Error"); 
            });
    } else {
        res.redirect("/login"); 
    }
};

const adminAuth = (req,res,next)=>{
    if(req.session.admin){
        User.findOne({isAdmin:true})
        .then(data=>{
            if(data){
            next()
            }else{
            res.redirect("/admin/login")
            }
        })
        .catch(error=>{
            console.error("Error in admin-auth middleware",error)
            res.status(500).send("Internal Server Error")
        })
    }else{
        res.redirect("/admin/login")
    }
}

module.exports={
    userAuth,
    adminAuth
}



