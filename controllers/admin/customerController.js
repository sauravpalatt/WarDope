const User = require("../../models/userSchema")
const mongoose = require("mongoose")

const userInfo = async (req, res) => {
    try {
        let search = ""; 
        if (req.query.search) {
            search = req.query.search;
        }

        let page = 1; 
        if (req.query.page) {
            page = parseInt(req.query.page); 
        }

        const limit = 3;

        const userData = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } } 
            ],
        })
            .limit(limit)
            .skip((page - 1) * limit)
            .exec();

            const count = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } }
            ],
        }).countDocuments();

        const totalPages = Math.ceil(count / limit);

        res.render("userList",{data: userData, totalPages, currentPage:page, count, search });
        
    } catch (error) {
        console.error("ERROR OCCURED IN USERINFO FUNCTION", error);
        res.status(500).send("Error occurred in code");
    }
};

const blockUser = async(req,res)=>{
    try {
        const userId = req.query.id
        const user = await User.findOne({_id:userId})

        if(user){
            user.isBlocked=true
            await user.save()
            res.redirect("/admin/users?message=User blocked successfully&type=success")
        }else{
            console.log("User not found @ blockUser fn")
        }
    } catch (error) {
        console.error("ERROR IN BLOCK USER FN",error)
    }
}

const unblockUser = async(req,res)=>{
    try {
        const userId = req.query.id
        const user = await User.findById(userId)
            if(user){
                user.isBlocked=false
                await user.save()
                res.redirect("/admin/users?message=User unblocked successfully&type=success")
            }else{
                console.log("User not found @ unblockUser fn")
            }  
    } catch (error) {
        console.error("UNBLOCK USER FN HAS AN ERROR",error)
    }   
}

module.exports={
    userInfo,
    blockUser,
    unblockUser 
}