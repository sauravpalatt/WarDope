const mongoose = require("mongoose")
const Coupon = require("./couponSchema")
const {Schema} = mongoose

const userSchema = new Schema({
    name:{
        type: String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    phone:{
        type:String,
        unique:false,
        sparse:true,
        default:null
    },
    addresses: [
        {
        type: Schema.Types.ObjectId,
        ref: 'Address' 
        }
    ],
    googleId: {
        type: String,
        sparse:true
    },
    password:{
        type:String,
        required:false
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
    cart:[{
        type:Schema.Types.ObjectId,
        ref:"Cart"
    }],
    wallet:[{
        type:Schema.Types.ObjectId,
        ref:"Wishlist"
    }],
    orderHistory:[{
        type:Schema.Types.ObjectId,
        ref:"Order"
    }],
    
    referalCode:{
        type:String,
        // required:true
    },
    redeemed:{
        type:Boolean,
        // required:true
    },
    redeemedUsers:[{
        type:Schema.Types.ObjectId,
        ref:"User"
    }],
    searchHistory:[{
        category:{
        type:Schema.Types.ObjectId,
        ref:"Category"
        },
        brand:{
            type:String,
        },
        searchOn:{
            type:Date,
            default:Date.now
        }
    }],
    appliedCoupon: [
        {
          Coupon: String,
          isRedeemed: { type: Boolean, default: false},
          appliedAt: { type: Date, default: Date.now }, 
        },
      ]
},{timestamps:true})

const User = mongoose.model("User",userSchema)

module.exports=User

 