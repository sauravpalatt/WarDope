const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({

    orderId: {type:String,unique:true,required:true},
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cartItems: [
        {
            productName: { type: String, required: true },
            price: { type: Number, required: true },
            quantity: { type: Number, required: true },
            size: {type: String, required: true},
            productId: {type:mongoose.Schema.Types.ObjectId, ref: 'Product'}
        },
    ],
    initialPrice: {type: Number},
    totalPrice: { type: Number, required: true },
    addressId: { type: mongoose.Schema.Types.ObjectId, ref: 'Address', required: true },
    deliveryType: { type: String, required: true },
    status: { type: String, enum: ['pending', 'shipped', 'delivered', 'canceled', 'return requested', 'return approved', 'return denied'], default: 'pending' },
    cancelReason: {
        type: String,    
        trim: true,
      },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    discount: {type: Number},
    coupon: {type: String}
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;

