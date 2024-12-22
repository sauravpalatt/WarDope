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

const addToCart = async(req, res) => {
  try {
      const user = req.session.user;
      const userId = await User.findById(user._id);

      console.log("Start");

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
      console.error('Error adding to cart:', error);
      res.status(500).json({ message: 'Failed to add product to cart.' });
  }
};

const updateCartQty = async (req, res) => {
    try {
      const { quantity } = req.body;  // Quantity from request body
      const { itemId } = req.params;   // Item ID from request parameters
      const userId = req.session.user._id;  // User ID from session
  
      console.log(`${quantity}`, `${itemId}`, `${userId}`);
  
      // Find the user's cart
      const cart = await Cart.findOne({ user: userId }).populate('items.product');
      if (!cart) {
        console.log("Cart not found");
        return res.status(404).json({ message: "Cart not found" });
      }
  
      // Find the specific item in the cart
      const cartItem = cart.items.find(item => item._id.toString() === itemId);
      if (!cartItem) {
        console.log("Item not found in cart");
        return res.status(404).json({ message: "Item not found in cart" });
      }
  
      console.log("Item found successfully: " + cartItem);
  
      // Update the item's quantity
      cartItem.quantity = quantity;
  
      // Recalculate totalPrice
      let totalPrice = 0;
      for (const item of cart.items) {
        const product = await Product.findById(item.product);
        if (!product) {
          console.log(`Product not found for item ${item._id}`);
          return res.status(404).json({ message: `Product not found for item ${item._id}` });
        }
        if (isNaN(item.quantity) || item.quantity <= 0) {
          console.log(`Invalid quantity for item ${item._id}`);
          return res.status(400).json({ message: `Invalid quantity for item ${item._id}` });
        }
        totalPrice += item.quantity * product.regularPrice;
      }
  
      // Update the total price in the cart
      cart.totalPrice = totalPrice;
      console.log(`TOTAL PRICE: ${cart.totalPrice}`);
  
      // Save the updated cart
      await cart.save();
  
      console.log("Cart updated successfully");
  
      // Respond with the updated data
      res.json({
        quantity,
        productPrice: cartItem.product.regularPrice,
        cartTotal: cart.totalPrice,
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



