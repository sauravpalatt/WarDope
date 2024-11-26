const mongoose = require("mongoose")
const {Schema} = mongoose


const productSchema = new Schema({
    productName:{
        type:String,
        required:true
    },
    productDescription:{
        type:String,
        required:true
    },
    brand:{
        type:String,
        required:true
    },
    regularPrice:{
        type:Number,
        required:true
    },
    salesPrice:{
        type:Number,
        required:true
    },
    productOffer:{
        type:Number,
        default:0
    },
    productImage:{
        type:[String],
        required:true
    },
    quantity:{
        type:Number,
        required:true
    },
    color:{
        type:String,
        required:true
    },
    isBlocked:{
        type:Boolean,
        requred:false
    },
    status:{
        type:String,
        enum:["Available","Out Of Stock","Discontinued"],
        default:Available
    },
},{timestamps:true});

const Product = mongoose.model("Product",productSchema)

module.exports=Product