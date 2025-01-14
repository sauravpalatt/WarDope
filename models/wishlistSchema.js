const mongoose = require("mongoose")
const {Schema} = mongoose

const wishlistSchema = new Schema ({
    User:{
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    Product:{
        type: Schema.Types.ObjectId,
        ref: 'Product'
    }
})

const Wishlist = mongoose.model("Wishlist",wishlistSchema)

module.exports = Wishlist