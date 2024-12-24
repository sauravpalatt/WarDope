const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({

    orderId: {type:String,unique:true,required:true},
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cartItems: [
        {
            productName: { type: String, required: true },
            price: { type: Number, required: true },
            quantity: { type: Number, required: true },
        },
    ],
    totalPrice: { type: Number, required: true },
    addressId: { type: mongoose.Schema.Types.ObjectId, ref: 'Address', required: true },
    deliveryType: { type: String, required: true },
    status: { type: String, enum: ['pending', 'shipped', 'delivered', 'canceled'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;

