const Cart = require("../../models/cartSchema")
const Product = require("../../models/productSchema")
const User = require("../../models/userSchema")
const Order = require("../../models/orderSchema")
const generateOrderId = require("../../utilities/generateOrderId")
const Address = require("../../models/addressSchema")


const cartList = async(req,res)=>{
    try {
        const user = req.session.user
        const userId = user._id
      
        if(!userId || !user){
          return console.log("User not found in cart")
        }

        const userData = await User.findById(userId)

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
            cartItems : cart?.items,
            totalPrice : cart?.totalPrice
        })

    } catch (error) {
        console.error(`ERROR IN CART LIST FN: ${error}`)
    }
}

const addToCart = async (req, res) => {
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

    // Check if the stock is sufficient
    if (product.stock < quantity) {
      return res.status(400).json({ message: 'Insufficient stock for the selected quantity.' });
    }

    let cart = await Cart.findOne({ user: userId });

    if (cart) {
      const existingProductIndex = cart.items.findIndex(
        (item) => item.product.toString() === productId && item.size === size
      );

      if (existingProductIndex !== -1) {
        // If the same product with the same size already exists, return a friendly message
        return res.status(200).json({
          message: 'This product is already in your cart with the selected size.',
          type: 'warning', // Indicate the type of message (warning)
        });
      } else {
        // If the product doesn't exist in the cart, add it
        cart.items.push({ product: productId, quantity, size });
        cart.totalPrice += totalItemPrice;
        await cart.save();
      }
    } else {
      // If the cart doesn't exist, create a new one
      cart = new Cart({
        user: userId,
        items: [{ product: productId, quantity, size }],
        totalPrice: totalItemPrice,
      });
      await cart.save();
    }

    return res.status(200).json({
      message: 'Product added to cart successfully.',
      cart,
    });
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

  const deleteCartItem = async (req, res) => {
    try {
      const { itemId } = req.params; // Cart item ID
      const userId = req.session.user._id; // User ID from session
  
      // Find the user's cart
      const cart = await Cart.findOne({ user: userId }).populate('items.product');
      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }
  
      // Find the cart item to delete
      const cartItemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
      if (cartItemIndex === -1) {
        return res.status(404).json({ message: "Item not found in cart" });
      }
  
      // Remove the cart item
      cart.items.splice(cartItemIndex, 1);
      await cart.save();
  
      // Recalculate cart subtotal
      const cartSubtotal = cart.items.reduce(
        (sum, item) => sum + item.quantity * item.product.regularPrice,
        0
      );
  
      // Return only the cartSubtotal to the frontend
      res.json({
        message: "Item removed successfully",
        cartSubtotal, // Only send the updated subtotal
      });
    } catch (error) {
      console.error("Error deleting cart item:", error);
      res.status(500).json({ message: "Error deleting cart item", error: error.message });
    }
};

  const placeOrder = async (req,res)=>{
   try {
    const userId = req.session.user._id;
    const { cartItems, totalPrice, addressId, deliveryType } = req.body;

    if (!cartItems || cartItems.length === 0) {
        return res.status(400).json({ error: 'Cart items cannot be empty' });
    }

    if (!totalPrice || totalPrice <= 0) {
        return res.status(400).json({ error: 'Total price must be greater than 0' });
    }

    if (!addressId) {
        return res.status(400).json({ error: 'Address ID is required' });
    }

    if (!deliveryType) {
        return res.status(400).json({ error: 'Delivery type is required' });
    }

      let order = new Order({
          userId,
          cartItems,
          totalPrice,
          addressId,
          deliveryType,
      });

      order = generateOrderId(order);

      await order.save();
      await Cart.deleteOne({user:userId})

    res.status(200).json({ message: 'Order placed successfully!' });

   } catch (error) {
      console.error("ERROR IN PLACE ORDER Fn",error)
   }

}

const ordersList = async(req,res)=>{
  try {
    const userId = req.session.user._id
   
    if(userId){
      const orders = await Order.find({ userId }).sort({ createdAt: -1 })
        
      res.render("orderList",{
        orders,
        user:userId
      })
    }

  } catch (error) {
    console.error("ERROR IN ORDER LIST FN:",error)   
  }
}

const orderDetail = async(req,res)=>{
    try {
      const userId = req.session.user._id
      const {orderId} = req.params

    
      const user = await User.findById(userId)

      if(!user){
        return console.log("No User")
      }

      const order = await Order.findOne({orderId:orderId})

      const addressId = order.addressId;

      if(!order){
        return console.log("order in db not found")
      }

      const addressDoc = await Address.findOne({
        userId: userId,
        "addresses._id": addressId
      }, {
        "addresses.$": 1  
      });
      
      if (!addressDoc) {
        return console.log('Address not found for this user');
      }
      
      const address = addressDoc.addresses[0];  // Get the matched address object

      res.render("orderDetail",{
        order,
        user,
        address: address 
      })

    } catch (error) {
      console.error("ERROR IN ORDER DETAIL FN",error)
    }
}

const cancelOrder = async (req, res) => {
 
  try {
   
    const { orderId } = req.params;  
    const userId = req.session.user._id;  

    const order = await Order.findOne({ orderId: orderId, userId: userId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status !== "pending") {
      return res.status(400).json({ message: "Order cannot be canceled as it is not in pending state" });
    }

    order.status = "canceled";
    
    await order.save();

    return res.status(200).json({ message: "Order has been successfully canceled" });
    
  } catch (error) {
    console.error("Error in canceling order:", error);
    return res.status(500).json({ message: "An error occurred while canceling the order" });
  }
};

const returnProduct = async (req,res)=>{
  const { orderId } = req.params
  try {
    const order = await Order.findOne({orderId:orderId});

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({ message: 'Return can only be requested for delivered orders.' });
    }

    order.status = 'return requested'
    await order.save();

    res.status(200).json({ message: 'Return request submitted successfully.' });

  } catch (error) {
     console.error('Error processing return request:', error);
     res.status(500).json({ message: 'Internal Server Error.' });
  }
}

module.exports = {
    addToCart,
    cartList,
    updateCartQty,
    deleteCartItem,
    placeOrder,
    ordersList,
    orderDetail,
    cancelOrder,
    returnProduct
}



