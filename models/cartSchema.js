const mongoose = require("mongoose")

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
    },
    size:{
      type: String,
      required: true,
    }
  }],
  totalPrice: {
    type: Number,
    default: 0,
  },
  productVariantId :{
    type: mongoose.Schema.Types.ObjectId
    
  }
});

module.exports = mongoose.model('Cart', cartSchema);