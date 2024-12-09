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
  images: {  // Updated to reflect multiple images
    type: [String],
    required: true,
  },
  category: {  // Added category reference
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",  // Assuming Category model exists
    required: true,
  },
  isBlocked: {
    type: Boolean,
    default: false,  // Default is false unless specified
  },
  status: {
    type: String,
    enum: ["Available", "Out Of Stock", "Discontinued"],
    default: "Available",
  },
}, { timestamps: true });

const Product = mongoose.model("Product", productSchema);

module.exports = Product;