const Cart = require("../../models/cartSchema")
const Product = require("../../models/productSchema")
const User = require("../../models/userSchema")


const cartList = async(req,res)=>{
    try {
        const user = req.session.user
        const userId = user._id
        const userData = await User.findById(userId)
       
        if(!user){
           return console.log("user not found in cart")
        }

        const cart = await Cart.findOne({ user: userId }).populate('items.product');

        if(!cart || cart.length == 0){
            res.render("cart",{
                user:userData,
                cartItems : [],
                totalPrice : 0
            })
        }

        res.render("cart",{
            user:userData,
            cartItems : cart.items,
            totalPrice : cart.price
        })

    } catch (error) {
        console.error("ERROR IN CART LIST FN",error)
    }
}

const addToCart = async(req,res)=>{
    try {
        const user = req.session.user
        const userId = user._id

        if(!userId || !user){
          return console.log("User is not logged in...")
        }

        const productId = req.params.productId
        const product = await Product.findById(productId)

        if(!product){
            return console.log("Product does not exist...")
        }

        let cart = await Cart.findOne({user : userId}) 

        if(!cart){

            cart = new Cart({
               user:userId,
               items:[{
                product:productId,
                quantity: 1
               }],
               totalPrice: product.regularPrice
            })

        }else{

            const existingItem = cart.items.find(item => item.product.toString() === productId);

            if(existingItem){
                existingItem.quantity += 1
            }else{
                cart.items.push({
                    product: productId,
                    quantity: 1
                });
            }

            cart.totalPrice += product.regularPrice;
        }

        await cart.save()

        // res.status(200).send("Product added to cart successfully");
        console.log("end ")

    } catch (error) {
        console.error("ERROR IN ADD TO CART FN",error)
    }
}


module.exports = {
    addToCart,
    cartList
}



