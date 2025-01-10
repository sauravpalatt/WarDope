const Cart = require("../../models/cartSchema")
const Product = require("../../models/productSchema")
const User = require("../../models/userSchema")
const Order = require("../../models/orderSchema")
const Wallet = require("../../models/walletSchema")
const generateOrderId = require("../../utilities/generateOrderId")
const Address = require("../../models/addressSchema")
const Wishlist = require("../../models/wishlistSchema")
const { userAuth } = require("../../middleware/auth")
const Coupon = require("../../models/couponSchema")
const crypto = require("crypto");
const Razorpay = require("razorpay")
const env = require("dotenv").config()

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

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

    // Validations
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart items cannot be empty' });
    }
    if (!totalPrice || totalPrice <= 0) {
      return res.status(400).json({ error: 'Total price must be greater than 0' });
    }
    if (!addressId) {
      return res.status(400).json({ error: 'Address is required' });
    }
    if (!deliveryType) {
      return res.status(400).json({ error: 'Method of payment is required' });
    }

    // Check stock and update product stock
    for (const { productId, size, quantity } of cartItems) {
      const variant = await Product.findOne(
        { _id: productId, "variants.size": size },
        { "variants.$": 1 }
      );
      if (!variant || variant.variants[0].stock < quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${productId}, size: ${size}` });
      }

      await Product.updateOne(
        { _id: productId, "variants.size": size },
        { $inc: { "variants.$.stock": -quantity } }
      );
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

    //Razorpay
    if (deliveryType === 'razorpay') {
      const options = {
        amount: totalPrice * 100, 
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
      };

      const order = await razorpay.orders.create(options);
      return res.status(200).json({ order, key: process.env.RAZORPAY_KEY_ID });
    }


    //Wallet
    if(deliveryType === "wallet"){

      const wallet = await Wallet.updateOne({userId},{$inc: {balance:-totalPrice}})

      if(!wallet){
        return console.log("Wallet not found !!!")
      }
    }

    res.status(200).json({ message: 'Order placed successfully!' });

  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature === razorpay_signature) {
      
      res.status(200).json({ success: true, message: 'Payment verified successfully!' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid payment signature!' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}

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
      
      const address = addressDoc.addresses[0]; 

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
    const { orderItems } = req.body; 

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

    let wallet = await Wallet.findOne({ userId: order.userId });
        if (!wallet) {
           
            wallet = new Wallet({ userId: order.userId });
        }

    if(order.deliveryType === "razorpay"){

      const refundAmount = order.totalPrice
      wallet.balance += refundAmount

      wallet.transactions.push({
        amount: refundAmount,
        type: 'credit',
        description: `Refund for ${order.status.toLowerCase()} order`,
      })

      await wallet.save()

    }

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

const wishlistInfo = async(req,res)=>{
  try {
    const {user} = req.session

    const items = await Wishlist.find({User:user}).populate("Product")

    const userId = await User.findById(user) // this user id is not mere id but includes all user document details

    res.render("wishlist",{items,user:userId})
  } catch (error) {
    console.error("Wishlist not found",error) 
  }
}

const addToWishlist = async(req,res)=>{
  try {
    const {user} = req.session
    const {productId} = req.body

    const existingItem = await Wishlist.findOne({
      User: user,
      Product: productId
    })

    if(existingItem){
      return res.status(400).json({success:false,message:"Item Already in Wishlist !!", errorType: "duplicate"})
    }

    const newWishlistItem = new Wishlist({
      User: user,
      Product: productId
    })

    await newWishlistItem.save()

    res.status(200).json({ success: true, message: "Added to wishlist" })

  } catch (error) {
    console.error("ERROR IN ADD TO WISHLIST FN",error)
  }
}

const removeFromWishlist = async(req,res)=>{
  try {
    const {id} = req.params
    const userId = req.session.user

    const result = await Wishlist.findOneAndDelete({
      User: userId,
      Product: id
    })

    if(result){
      return res.status(200).json({success:true,message:"Product removed"})
    }
     res.status(404).json({success:false,message:"Oops...Try again"})

  } catch (error) {
    console.error("ERROR IN REMOVE WISHLIST FN",error)
  }
}

const applyCoupon = async(req,res)=>{
  
  const userId = req.session.user
  const { totalPrice, discountValue, couponCode} = req.body

  console.log(`couponCode ${couponCode}`)

  try {
    
    const user = await User.findById(userId)

    if(user.appliedCoupon) {
      return res.status(404).json({success:false,message: "Oops...You already redeemed a coupon"})
    }
     
    const coupon = await Coupon.findOne({code: couponCode}) 
    
    if(!coupon){
      return res.status(404).json({success:false,message: "Coupon does not exist or not active currently"})
    }

    const amountDeducted = Math.round(totalPrice * discountValue/100)

    console.log(`Amt Deducted: ${amountDeducted}`)

    const discountPrice = Math.round(totalPrice - amountDeducted)

    console.log(`discountPrice: ${discountPrice}`)

    user.appliedCoupon =  couponCode
    await user.save()

    console.log("end")
    return res.json({discountPrice,amountDeducted})
    
  } catch (error) {
    console.error("ERROR IN APPLY COUPON FN",error)
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
    returnProduct,
    wishlistInfo,
    addToWishlist,
    removeFromWishlist,
    applyCoupon,
    verifyPayment
}



