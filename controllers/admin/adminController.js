const mongoose = require("mongoose")
const bcrypt = require("bcrypt")
const env = require("dotenv").config()
const User = require("../../models/userSchema")
const Order = require("../../models/orderSchema")
const Wallet = require("../../models/walletSchema")
const Product = require("../../models/productSchema")
const moment = require("moment");


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

const loadDashboard = async (req, res) => {
  try {
    if (req.session.admin) {
      
      let { filter } = req.query;
      let startDate, endDate;

      if (filter === "yearly") {
        startDate = moment().startOf("year").toDate();
        endDate = moment().endOf("year").toDate();
      } else if (filter === "monthly") {
        startDate = moment().startOf("month").toDate();
        endDate = moment().endOf("month").toDate();
      } else if (filter === "weekly") {
        startDate = moment().startOf("week").toDate();
        endDate = moment().endOf("week").toDate();
      } else if (filter === "custom") {
       
        startDate = new Date(req.query.startDate);
        endDate = new Date(req.query.endDate);

      } else {
        startDate = moment().startOf("year").toDate();
        endDate = moment().endOf("year").toDate();
      }

      // Aggregation to calculate total sales
      const salesTotal = await Order.aggregate([
        {
          $match: { createdAt: { $gte: startDate, $lte: endDate } },
        },
        {
          $group: {
            _id: "null",
            totalsales: { $sum: "$totalPrice" },
          },
        },
      ]);

      const topProducts = await Order.aggregate([
        {
          $match: { createdAt: { $gte: startDate, $lte: endDate } } 
        },
        { $unwind: "$cartItems" },
        {
          $group: {
            _id: "$cartItems.productId",
            totalSales: { $sum: { $multiply: ["$cartItems.price", "$cartItems.quantity"] } },
            productName: { $first: "$cartItems.productName" },
          },
        },
        { $sort: { totalSales: -1 } },
        { $limit: 10 },
      ]);

      const topCategories = await Order.aggregate([
        {
          $match: { createdAt: { $gte: startDate, $lte: endDate } } // Filter orders based on date
        },
        { $unwind: "$cartItems" },
        {
          $lookup: {
            from: "products",
            localField: "cartItems.productId",
            foreignField: "_id",
            as: "productDetails",
          },
        },
        { $unwind: "$productDetails" },
        {
          $group: {
            _id: "$productDetails.category",
            totalSales: { $sum: { $multiply: ["$cartItems.price", "$cartItems.quantity"] } },
          },
        },
        { $sort: { totalSales: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "categoryInfo",
          },
        },
        { $unwind: "$categoryInfo" },
        {
          $project: {
            _id: 1,
            totalSales: 1,
            categoryName: "$categoryInfo.categoryName",
          },
        },
      ]);

      const countOrders = await Order.countDocuments({});
      const countProducts = await Product.countDocuments({});
      const totalSales = salesTotal[0] ? salesTotal[0].totalsales : 0;

      if (req.accepts('json') && filter) {
        return res.json({
          totalSales,
          countOrders,
          countProducts,
          topProducts,
          topCategories,
          filter
        });
      } else {
        return res.render("dashboard", {
          totalSales,
          countOrders,
          countProducts,
          topProducts,
          topCategories,
          filter
        });
      }
    } else {
      return res.redirect("/pageerror");
    }
  } catch (error) {
    console.error("Error loading Dashboard", error);
  }
};

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

const approveReturn = async(req,res)=>{
    const { orderId } = req.params

    try {
      const order = await Order.findById(orderId)
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.status !== "return requested") {
        return res.status(400).json({ message: "Cannot approve return for this order." });
      }

       order.status = "return approved"
       await order.save();

        let wallet = await Wallet.findOne({ userId: order.userId });
        if (!wallet) {
            wallet = new Wallet({ userId: order.userId });
        }
       
        const refundAmount = order.totalPrice

        wallet.balance += refundAmount
       
        wallet.transactions.push({
        amount: refundAmount,
        type: 'credit',
        description: `Refund for ${order.status.toLowerCase()} order`,
        })

        await wallet.save()
       
       res.status(200).json({ message: "Return approved successfully." })

    } catch (error) {
        console.error("ERROR IN APPROVE RETURN FN: ",error)
    }
}

const denyReturn = async(req,res)=>{
    const {orderId} = req.params
    try {
        const order = await Order.findById(orderId)

        if(!order){
            return res.status(404).json({ message: "Order not found" })
        }

        if (order.status !== "return requested") {
            return res.status(400).json({ message: "Cannot approve return for this order." });
        }

        order.status = "return denied";
        await order.save();

        res.status(200).json({ message: "Return denied successfully." })

    } catch (error) {
        console.error("ERROR IN DENY RETURN FN",error)
    }
}

module.exports={
    loadLogin,
    login,
    loadDashboard,
    pageerror,
    adminLogout,
    approveReturn,
    denyReturn,
}

