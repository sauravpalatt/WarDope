const Cart = require("../../models/cartSchema")
const Product = require("../../models/productSchema")
const User = require("../../models/userSchema")
const Order = require("../../models/orderSchema")
const generateOrderId = require("../../utilities/generateOrderId")
const Address = require("../../models/addressSchema")


const cartList = async (req, res) => {
  try {
    const userId = req.session.user;

    if (!userId) {
      console.log("User not found in cart");
      return res.render("cart", {
        user: null,
        cartItems: [],
        totalPrice: 0
      });
    }

    const userData = await User.findById(userId);

    const cart = await Cart.findOne({ user: userId }).populate('items.product');

    if (!cart || cart.items.length === 0) {
      return res.render("cart", {
        user: userData,
        cartItems: [],
        totalPrice: 0
      });
    }

    const cartItems = cart.items.map(item => {
      const product = item.product;
      const variantId = item.variantId;

      const variant = product.variants.find(variant => variant._id.toString() === variantId.toString());

      const stockLeft = variant ? variant.stock : 0;

      return {
        ...item._doc, 
        stockLeft 
      };
    });

    res.render("cart", {
      user: userData,
      cartItems, 
      totalPrice: cart.totalPrice
    });

  } catch (error) {
    console.error(`ERROR IN CART LIST FN: ${error}`);
    res.status(500).send("Internal Server Error");
  }
};

const addToCart = async (req, res) => {
  try {
    const user = req.session.user;
    const userId = await User.findById(user);

    const { size, productId, quantity} = req.body;

    if (!size || !quantity || !userId) {
      return res.status(400).json({ message: 'Size, UserId, Quantity or Address Details missing.' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const variant = await Product.findOne({_id: productId,"variants.size":size},{'variants.$':1})
    
    const variantId=variant.variants[0]._id

    const price = product.regularPrice;
    const totalItemPrice = price * quantity;

    let cart = await Cart.findOne({ user: userId });

    if (cart) {
      const existingProductIndex = cart.items.findIndex(
        (item) => item.product.toString() === productId && item.size === size
      );

      if (existingProductIndex !== -1) {
        
        return res.status(200).json({
          message: 'This product is already in your cart with the selected size.',
          type: 'warning', 
        });
      } else {
        
        cart.items.push({ product: productId, quantity, size, variantId });
        cart.totalPrice += totalItemPrice;
        await cart.save();
      }
    } else {
      
      cart = new Cart({
        user: userId,
        items: [{ product: productId, quantity, size, variantId }],
        totalPrice: totalItemPrice,
      });
      await cart.save();
    }

    return res.status(200).json({
      message: 'Product added to cart successfully.',
      cart,
    });
  } catch (error) {
    console.error("ERROR IN ADD TO CART FUNCTION:",error)
    res.status(500).json({ message: 'Failed to add product to cart.' });
  }
};

const updateCartQty = async (req, res) => {
  
    try {
      const { quantity } = req.body;  
      const { itemId } = req.params;   
      const userId = req.session.user;  
  
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
      const userId = req.session.user; // User ID from session
  
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
  
      res.json({
        message: "Item removed successfully",
        cartSubtotal, 
      });
    } catch (error) {
      console.error("Error deleting cart item:", error);
      res.status(500).json({ message: "Error deleting cart item", error: error.message });
    }
};

const placeOrder = async (req, res) => {
  try {
      const userId = req.session.user;
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

      for (const { productId, size, quantity } of cartItems) {
        
          const variant = await Product.findOne(
              { _id: productId, "variants.size": size },
              { "variants.$": 1 }
          );

          if (!variant) {
              return console.log( `Product or variant not found for productId: ${productId}, size: ${size}`);
          }

          const stockLeft = variant.variants[0].stock;

          if (stockLeft < quantity) {
              return res.status(400).json({ 
                  error: `Insufficient stock for productId: ${productId}, size: ${size}. Available stock: ${stockLeft}` 
              });
          }

          const updated = await Product.updateOne(
              { _id: productId, "variants.size": size },
              { $inc: { "variants.$.stock": -quantity } }
          );

          if (updated.modifiedCount === 0) {
              return res.status(500).json({ 
                  error: `Failed to update stock for productId: ${productId}, size: ${size}` 
              });
          }
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

      await Cart.deleteOne({ user: userId });

      res.status(200).json({ message: 'Order placed successfully!' });
  } catch (error) {
      console.error("Error in placeOrder function:", error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
};

const ordersList = async(req,res)=>{
  try {
    const userId = req.session.user
    if(userId){
      const orders = await Order.find({ userId }).sort({ createdAt: -1 })

      const user = await User.findById(userId)
        
      res.render("orderList",{
        orders,
        user
      })
    }

  } catch (error) {
    console.error("ERROR IN ORDER LIST FN:",error)   
  }
}

const orderDetail = async(req,res)=>{
    try {
      const userId = req.session.user
      const {orderId} = req.params

      const user = await User.findById(userId)

      const order = await Order.findOne({ orderId: orderId, userId: userId })

      if(!user){
        return console.log("No User")
      }

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
    const userId = req.session.user;
    const { orderItems } = req.body; // orderItems contains productId, size, and quantity

    const user = await User.findById(userId);

    if (!user) {
      return console.log("No User");
    }

    const order = await Order.findOne({ orderId: orderId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status !== "pending") {
      return res.status(400).json({
        message: "Order cannot be canceled as it is not in a pending state",
      });
    }

    // Revert stock for each canceled product
    for (const { productId, size, quantity } of orderItems) {
      const variant = await Product.findOne(
        { _id: productId, "variants.size": size },
        { "variants.$": 1 }
      );

      if (!variant) {
        return console.log(
          `Product or variant not found for productId: ${productId}, size: ${size}`
        );
      }

      const updated = await Product.updateOne(
        { _id: productId, "variants.size": size },
        { $inc: { "variants.$.stock": quantity } } 
      );

      if (updated.modifiedCount === 0) {
        return res.status(500).json({
          error: `Failed to update stock for productId: ${productId}, size: ${size}`,
        });
      }
    }

    order.status = "canceled";
    await order.save();

    return res.status(200).json({
      message: "Order has been successfully canceled, and stock has been reverted.",
    });
  } catch (error) {
    console.error("Error in canceling order:", error);
    return res.status(500).json({
      message: "An error occurred while canceling the order",
    });
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



