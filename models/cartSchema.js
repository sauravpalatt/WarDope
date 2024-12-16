const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
    }
  ],
  totalItems: { 
    type: Number, 
    default: function() { return this.items.reduce((sum, item) => sum + item.quantity, 0); } 
  },
  totalPrice: { 
    type: Number, 
    default: function() { return this.items.reduce((sum, item) => sum + (item.quantity * item.price), 0); } 
  },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Cart', cartSchema);