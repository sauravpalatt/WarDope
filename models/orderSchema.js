const mongoose = require('mongoose');
const {Schema} = mongoose

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [{ name: String, price: Number, quantity: Number }],
  total: Number,
  date: { type: Date, default: Date.now },
});


module.exports = mongoose.model('Order', orderSchema);