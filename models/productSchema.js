const mongoose = require("mongoose");
const { Schema } = mongoose;

const productSchema = new Schema({
  productName: {
    type: String,
    required: true,
  },
  productDescription: {
    type: String,
    required: true,
  },
  regularPrice: {
    type: Number,
    required: true,
  },
  promotionalPrice: {
    type: Number,
    required: true,
  },
  productOffer: {
    type: Number,
    default: 0,
  },
  images: {  
    type: [String],
    required: true,
  },
  category: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",  
    required: true,
  },
  isBlocked: {
    type: Boolean,
    default: false,  
  },
  variants: [  
    {
      size: {
        type: String,
        required: true, 
      },
      stock: {
        type: Number,
        required: true, 
      },
    },
  ],
}, { timestamps: true });

const Product = mongoose.model("Product", productSchema);

module.exports = Product;