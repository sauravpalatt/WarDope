const mongoose =require("mongoose")
const {Schema} =mongoose

const categorySchema = new Schema({
    categoryName:{
        type:String,
        required:true,
        unique:true
    },
    description:{
        type:String,
        required:true,
    },
    isActive:{
        type:Boolean,
        default:true
    },
    offer: {
        type: Number,
        default:0
      }
},{timestamps:true})

const Category= mongoose.model("Category",categorySchema)

module.exports=Category