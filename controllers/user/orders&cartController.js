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
            totalPrice : cart. totalPrice
        })

    } catch (error) {
        console.error("ERROR IN CART LIST FN",error)
    }
}

const addToCart = async(req, res) => {
  try {
      const user = req.session.user;
      const userId = await User.findById(user._id);

      const { size, productId, quantity } = req.body;

      if (!size || !quantity || !userId) {
          return res.status(400).json({ message: 'Size, UserId, and Quantity are required.' });
      }

      const product = await Product.findById(productId);
      if (!product) {
          return res.status(404).json({ message: 'Product not found.' });
      }

      const price = product.regularPrice;
      const totalItemPrice = price * quantity;

      let cart = await Cart.findOne({ user: userId });

      if (cart) {
          const existingProductIndex = cart.items.findIndex(
              (item) => item.product.toString() === productId && item.size === size
          );

          if (existingProductIndex !== -1) {
              // If the product already exists with the same size, update the quantity
              cart.items[existingProductIndex].quantity += quantity;
              cart.totalPrice += totalItemPrice;
          } else {
              // If the product doesn't exist in the cart, add it
              cart.items.push({ product: productId, quantity, size });
              cart.totalPrice += totalItemPrice;
          }
      } else {
          // If the cart doesn't exist, create a new one
          cart = new Cart({
              user: userId,
              items: [{ product: productId, quantity, size }],
              totalPrice: totalItemPrice,
          });
      }

      await cart.save();
      res.status(200).json({ message: 'Product added to cart successfully.', cart });
  } catch (error) {
      res.status(500).json({ message: 'Failed to add product to cart.' });
  }
};

const updateCartQty = async (req, res) => {
    try {
      const { quantity } = req.body;  
      const { itemId } = req.params;   
      const userId = req.session.user._id;  
  
      const cart = await Cart.findOne({ user: userId }).populate('items.product');
      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }
  
      const cartItem = cart.items.find(item => item._id.toString() === itemId);
      if (!cartItem) {
        return res.status(404).json({ message: "Item not found in cart" });
      }
  
      cartItem.quantity = quantity;
  
      let totalPrice = 0;
      for (const item of cart.items) {
        const product = await Product.findById(item.product);
        if (!product) {
          return res.status(404).json({ message: `Product not found for item ${item._id}` });
        }
        if (isNaN(item.quantity) || item.quantity <= 0) {
          return res.status(400).json({ message: `Invalid quantity for item ${item._id}` });
        }
        totalPrice += item.quantity * product.regularPrice;
      }
  
      cart.totalPrice = totalPrice;

      const cartSubtotal = cart.totalPrice

      const shippingCost = cartSubtotal > 1000 ? 500 : 150;

      const cartTotal = cartSubtotal + shippingCost;

      await cart.save();
  
      res.json({
        quantity,
        productPrice: cartItem.product.regularPrice,
        shippingCost,
        cartSubtotal,
        cartTotal
      });
      
    } catch (error) {
      console.error('Error updating cart:', error);
      res.status(500).json({ message: 'Error updating cart', error: error.message });
    }
  };



  


module.exports = {
    addToCart,
    cartList,
    updateCartQty
}



