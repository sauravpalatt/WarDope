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
const PDFDocument = require("pdfkit");
const fs = require("fs")
const path = require("path");


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
    const cart = await Cart.findOne({ user: userId }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.render("cart", {
        user: userData,
        cartItems: [],
        totalPrice: 0
      });
    }

    // Resolve all promises using Promise.all
    const cartItems = await Promise.all(
      cart.items.map(async (item) => {
        if (!item.product) return null; // Ensure product exists

        const variant = item.product.variants.find(
          (variant) => variant._id.toString() === item.variantId.toString()
        );

        const stockLeft = variant ? variant.stock : 0;

        if (stockLeft === 0) {
          await cart.updateOne({ user: userId }, { $pull: { items: { _id: item._id } } });
          return null;
        } else {
          return { ...item._doc, stockLeft };
        }
      })
    );

    const filteredItems = cartItems.filter((item) => item !== null);

    const totalPrice = filteredItems.reduce((total, item) => {
      return total + (item?.product?.promotionalPrice || 0) * item.quantity;
    }, 0);

    res.render("cart", {
      user: userData,
      cartItems: filteredItems,
      totalPrice
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

    const price = product.promotionalPrice;
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
        totalPrice += item.quantity * product.promotionalPrice;
      }
  
      cart.totalPrice = totalPrice;

      const cartSubtotal = cart.totalPrice

      const shippingCost = cartSubtotal > 1000 ? 500 : 150;

      const cartTotal = cartSubtotal + shippingCost;

      await cart.save();
  
      res.json({
        quantity,
        productPrice: cartItem.product.promotionalPrice,
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
        (sum, item) => sum + item.quantity * item.product.promotionalPrice,
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
    const { cartItems, totalPrice, addressId, deliveryType, initialPrice, } = req.body;
   
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

    const address = await Address.findOne({userId:userId,"addresses._id":addressId},{"addresses.$":1})

    let order = new Order({
      userId,
      cartItems,
      totalPrice,
      initialPrice,
      address:{
        title: address.addresses[0].title,
        street: address.addresses[0].street,
        city: address.addresses[0].city,
        state: address.addresses[0].state,
        pincode: Number(address.addresses[0].pinCode),
        country: address.addresses[0].country
      },
      deliveryType,
      discount: req.session.amountDeducted ? req.session.amountDeducted : 0,
      coupon: req.session.couponCode ? req.session.couponCode : "null"
    });

    order = generateOrderId(order);
    await Cart.deleteOne({ user: userId });

    await User.updateOne({_id:userId,"appliedCoupon.Coupon":req.session.couponCode},
      {$set: {"appliedCoupon.$.isRedeemed":true}})

    req.session.amountDeducted = 0
    req.session.couponCode = "null"

    //Razorpay
    if (deliveryType === 'razorpay') {
      const options = {
        amount: totalPrice * 100, 
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
      };

      const razorpayOrder = await razorpay.orders.create(options);

      order.razorpayOrderId = razorpayOrder.id;
    }

    //Wallet
    if(deliveryType === "wallet"){

      await Wallet.updateOne({userId},{$inc: {balance:-totalPrice}})

      let wallet = await Wallet.findOne({userId})

      wallet.transactions?.push({
        amount: totalPrice,
        type: "debit",
        description: `Payment made via wallet`,
        date: new Date()
      })

      await wallet.save()

      order.status = 'paid'

      if(!wallet){
        return console.log("Wallet not found !!!")
      }
    }

    await order.save();

    if(deliveryType === "razorpay"){
      return res.status(200).json({ order, key: process.env.RAZORPAY_KEY_ID });
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

      const order = await Order.updateOne({razorpayOrderId:razorpay_order_id},
        {$set:{status:"paid"}})

      if(!order){
        return console.log("order not found")
      }  
      
      res.status(200).json({ success: true, message: 'Payment verified successfully!' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid payment signature!' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}

const ordersList = async (req, res) => {
  try {
    const userId = req.session.user;
    if (userId) {
      const page = parseInt(req.query.page) || 1; 
      const limit = 10; 
      const skip = (page - 1) * limit; 

      const totalOrders = await Order.countDocuments({ userId }); 
      const totalPages = Math.ceil(totalOrders / limit); 

      const orders = await Order.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const user = await User.findById(userId);

      res.render("orderList", {
        orders,
        user,
        currentPage: page,
        totalPages,
      });
    }
  } catch (error) {
    console.error("ERROR IN ORDER LIST FN:", error);
  }
};

const orderDetail = async(req,res)=>{
    try {
      const userId = req.session.user
      const {orderId} = req.params

      const user = await User.findById(userId)

      const order = await Order.findOne({ orderId: orderId, userId: userId })

      if(!user){
        return console.log("No User")
      }

      const addressData = {
        title: order.address.title,
        street: order.address.street,
        city: order.address.city,
        state: order.address.state,
        pincode: order.address.pincode,
        country: order.address.country
      }

      res.render("orderDetail",{
        order,
        user,
        address: addressData
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
    const {reason} = req.body

    console.log(`cancel reason: ${typeof reason}`)

    const user = await User.findById(userId);

    if (!user) {
      return console.log("No User");
    }

    const order = await Order.findOne({ orderId: orderId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

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
    order.cancelReason = reason

    await order.save();

    let wallet = await Wallet.findOne({ userId: order.userId });
        if (!wallet) {
           
            wallet = new Wallet({ userId: order.userId });
        }

    if(order.deliveryType === "razorpay" || order.deliveryType === "wallet" ){

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

  try {

    const user = await User.findById(userId)

    const dateToday = new Date()

    const redeemedCoupon = await User.findOne({
      _id: userId,
      appliedCoupon: { $elemMatch: { Coupon: couponCode, isRedeemed: true } },
    });

    if(redeemedCoupon) {
      return res.status(404).json({success:false,message:"This coupon has been redeemed"})
    }

    const invalidCoupon = await Coupon.findOne({code:couponCode})

    if(dateToday > invalidCoupon.endDate){
      return res.status(404).json({success:false,message: "This coupon has been expired"})
    }

    if(totalPrice < invalidCoupon.minPurchase){
      return res.status(404).json({success:false, message: `Coupon available only for purchase ₹${invalidCoupon.minPurchase}.00 or above`})
    }

    const couponType = await Coupon.findOne({code:couponCode},{discountType:1})

    const discountType = couponType.discountType
     
    let amountDeducted = null

    if(discountType === "percentage"){
      amountDeducted = Math.round((totalPrice * discountValue) / 100);
    }else{
      amountDeducted = parseInt(discountValue)
    }
    
    const discountPrice = Math.round(totalPrice - amountDeducted);

    req.session.amountDeducted = amountDeducted
    req.session.couponCode = couponCode

    const existingCoupon = await User.findOne({_id:userId,
    appliedCoupon:{$elemMatch: { Coupon:couponCode}}})

    if(!existingCoupon){
      user.appliedCoupon.push({ Coupon: couponCode, appliedAt: new Date() });
    }
    
    await user.save()
    
    return res.json({ discountPrice, amountDeducted });
    
  } catch (error) {
    console.error("ERROR IN APPLY COUPON FN",error)
  }
}

const removeCoupon = async (req,res)=>{
  try {
    req.session.amountDeducted = 0
    req.session.couponCode = null

    return res.status(200).send({success:true,message:"Coupon removed"})
  } catch (error) {
    console.error("ERROR IN REMOVE COUPON FN",error)
  }
}

const getWalletInfo = async (req, res) => {
  try {
    const userId = req.session.user;
    const wallets = await Wallet.findOne({ userId });

    const user = await User.findById(userId);

    const page = parseInt(req.query.page) || 1; 
    const limit = 5; 
    const skip = (page - 1) * limit;

    const wallet = wallets ? wallets.transactions.slice(skip, skip + limit) : [];
    const walletBalance= wallets ? wallets.balance : 0
    
    const totalTransactions = wallets ? wallets.transactions.length : 0;
    const totalPages = Math.ceil(totalTransactions / limit);

    res.render("wallet", {
      wallet,
      walletBalance,
      user,
      currentPage: page,
      totalPages: totalPages
    });
  } catch (error) {
    console.error("ERROR IN WALLET INFO FN", error);
  }
};

const downloadInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log(`orderid: ${orderId }`)

    const order = await Order.findOne({ orderId }).populate("userId cartItems.productId");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Fetch the address details using the order's addressId
    let addressVariant = await Address.findOne({ "addresses._id": order.addressId }, { "addresses.$": 1 });

    // If addressVariant is not found, return a 404 error
    if (!addressVariant) {
      return res.status(404).json({ message: "Address not found" });
    }

    const address = addressVariant.addresses[0]; 

    const invoicesDir = path.join(__dirname, "../invoices");
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
    }

    const invoicePath = path.join(invoicesDir, `invoice_${orderId}.pdf`);
    const doc = new PDFDocument({ size: "A4", margin: 50 });

    const writeStream = fs.createWriteStream(invoicePath);
    doc.pipe(writeStream);

    // Generate the invoice content
    generateHeader(doc);
    generateCustomerInformation(doc, order, address); // Pass the address as an argument
    generateInvoiceTable(doc, order);
    generateFooter(doc);

    doc.end();

    // Send the generated invoice file as a response
    writeStream.on("finish", () => {
      res.download(invoicePath, `Invoice_${orderId}.pdf`, (err) => {
        if (err) console.error("Error sending file:", err);
        fs.unlinkSync(invoicePath); // Delete the file after sending
      });
    });
  } catch (error) {
    console.error("Error generating invoice:", error);
    res.status(500).json({ message: "Failed to generate invoice" });
  }
};

function generateHeader(doc) {
  doc
    .image("logo.png", 50, 45, { width: 50 })
    .fillColor("#444444")
    .fontSize(20)
    .text("WarDope", 110, 57)
    .fontSize(10)
    .text("WarDope", 200, 50, { align: "right" })
    .text("123 Fashion Street", 200, 65, { align: "right" })
    .text("Kasaragod, Kerala, 671123", 200, 80, { align: "right" })
    .moveDown();
}

function generateCustomerInformation(doc, order, address) {
  doc
    .fillColor("#444444")
    .fontSize(20)
    .text("Invoice", 50, 160);
  generateHr(doc, 185);

  const customerInformationTop = 200;
  doc
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("Order ID:", 50, customerInformationTop)
    .font("Helvetica")
    .text(order.orderId, 150, customerInformationTop)
    .font("Helvetica-Bold")
    .text("Order Date:", 50, customerInformationTop + 15)
    .font("Helvetica")
    .text(new Date(order.createdAt).toLocaleDateString(), 150, customerInformationTop + 15)
    .font("Helvetica")
    .text("Total Price:", 50, customerInformationTop + 30)
    .text(`${order.totalPrice}.00`, 150, customerInformationTop + 30)
    .font("Helvetica-Bold")
    .text("Name:", 300, customerInformationTop)
    .font("Helvetica")
    .text(order.userId.name, 350, customerInformationTop)
    .font("Helvetica-Bold")
    .text("Address:", 300, customerInformationTop + 15)
    .font("Helvetica")
    .text(address.street, 350, customerInformationTop + 15)
    .text(`${address.city}, ${address.state}, ${address.pinCode}, ${address.country}`, 350, customerInformationTop + 30)
    .moveDown();
  generateHr(doc, 252);
}

function generateInvoiceTable(doc, order) {
  let i;
  const invoiceTableTop = 330;

  doc.font("Helvetica-Bold");
  generateTableRow(doc, invoiceTableTop, "Item", "Size", "Unit Cost", "Quantity", "Total");
  generateHr(doc, invoiceTableTop + 20);
  doc.font("Helvetica");

  for (i = 0; i < order.cartItems.length; i++) {
      const item = order.cartItems[i];
      const position = invoiceTableTop + (i + 1) * 30;
      generateTableRow(
          doc,
          position,
          item.productName,
          item.size,
          `${item.price}.00`,
          item.quantity,
          `${item.price * item.quantity}.00`
      );
      generateHr(doc, position + 20);
  }
}

function generateFooter(doc) {
  doc.fontSize(10).text("Thank you for shopping with us!", 50, 780, { align: "center", width: 500 });
}

function generateTableRow(doc, y, item, size, unitCost, quantity, total) {
  doc
      .fontSize(10)
      .text(item, 50, y)
      .text(size, 200, y)
      .text(unitCost, 280, y, { width: 90, align: "right" })
      .text(quantity, 370, y, { width: 90, align: "right" })
      .text(total, 0, y, { align: "right" });
}

function generateHr(doc, y) {
  doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
}

const retryRazorpay = async (req, res) => {
  try {
    const { finalAmount } = req.body;

    const order = await razorpay.orders.create({
      amount: finalAmount * 100,
      currency: "INR",
      receipt: "order_rcptid_11"
    });

    console.log(`key id: ${process.env.RAZORPAY_KEY_ID}`)

    res.status(200).json({ key: razorpay.key_id, order });

  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({ error: "Failed to create Razorpay order." });
  }
};

const verifyRetryPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = req.body;

    const hmac = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (hmac === razorpay_signature) {
      await Order.updateOne({ _id: order_id }, { $set: { status: "paid" } });
      res.status(200).json({ success: true, orderId: order_id });
    } else {
      res.status(400).json({ success: false });
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ error: "Payment verification failed." });
  }
};


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
    verifyPayment,
    removeCoupon,
    getWalletInfo,
    downloadInvoice,
    retryRazorpay,
    verifyRetryPayment
}



