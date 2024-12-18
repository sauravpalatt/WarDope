const mongoose = require('mongoose');
const {Schema} = mongoose;

const addressSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    addresses: [
        {
            title: { type: String, required: true }, // e.g., Home, Office
            street: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            pinCode: { type: String, required: true },
            country: { type: String, required: true }
        }
    ]
}, { timestamps: true });

const Address = mongoose.model("Address",addressSchema)
module.exports = Address;