const Address = require("../../models/addressSchema")
const User = require("../../models/userSchema")
const Cart = require("../../models/cartSchema")
const Coupon = require("../../models/couponSchema")
const Wallet = require("../../models/walletSchema")
const Product = require("../../models/productSchema")
const Category = require("../../models/categorySchema")

    const addressPageInfo = async (req, res) => {
        try {
        const userId = req.session.user;

        if (userId) {
            const user = await User.findById(userId); 
            if (!user) {
                console.log("User not found.");
                return res.redirect('/login');
            }

            const userAddresses = await Address.findOne(
                { userId },
                { addresses: 1 } 
            );

            if (userAddresses) {
                userAddresses.addresses = userAddresses.addresses.filter(addr => !addr.deleted);
            } else {
                console.log("No addresses found for this user.");
            }

            const addresses = userAddresses ? userAddresses.addresses : [];

            return res.render("address", { addresses, user });
        }

        console.log("User not found in session.");
        return res.redirect('/login');

        } catch (error) {
            console.error("ERROR IN ADDRESS PAGE:", error);
            return res.status(500).json({ success: false, message: "Error fetching addresses." });
        }
    }

    const validCheck = async (req,res)=>{
        try {
          const userId = req.session.user
         const user = await User.findById(userId);

         if(!user){
            console.log("User not found.");
            return res.redirect('/login');
         }
         const cart = await Cart.findOne({ user: userId }).populate("items.product");
         if (!cart || cart.items.length === 0) return res.json({ redirect: "/" });

        for(let item of cart.items){
            if(item.product.isBlocked){
                return res.json({message:`Product ${item.product.productName} is not available`})
            }
        }

        const blockedCategory = await Category.find({ isActive: false });

        const blockedCategoryIds = blockedCategory.map(category => category._id.toString());
        
        const myCategory = cart.items.map(item => item.product.category.toString());
        
        for (const category of myCategory) {
            if (blockedCategoryIds.includes(category)) {
                const blockedCat = blockedCategory.find(cat => cat._id.toString() === category);
                return res.json({message:`Category: ${blockedCat.categoryName} unavailable`});
            }
        }

        return res.json({ redirect: "/checkout" })
        
        } catch (error) {
            console.error("ERROR IN VALID-CHECK FN",error)
        }
    }

    const checkOutInfo = async (req,res)=>{
        try {
            const userId = req.session.user;
            if (userId) {
                const user = await User.findById(userId); 

                if (!user) {
                    console.log("User not found.");
                    return res.redirect('/login');
                }

                const userAddresses = await Address.findOne({ userId: userId });

                if (userAddresses) {
                    userAddresses.addresses = userAddresses.addresses.filter(addr => !addr.deleted);
                } else {
                    console.log("No addresses found for this user.");
                }

                const addresses = userAddresses ? userAddresses.addresses : [];

                 const cart = await Cart.findOne({ user: userId }).populate("items.product")
 
                 if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
                   return res.redirect("/")
                }

                const blockedProduct = cart.items.find(item => item.product.isBlocked === true);
                if (blockedProduct) {
                    console.log(`Product Name: ${blockedProduct.product.productName}`)
                    return res.json({ message: `Product ${blockedProduct.product.productName} is not available` });
                }

                const coupons = await Coupon.find({status:"active",endDate:{$gte: new Date()}})

                const wallet = await Wallet.findOne({userId:user})

                    res.render("checkout",{
                        user,
                        addresses,
                        cartItems : cart.items,
                        totalPrice : cart.totalPrice,
                        coupons,
                        wallet
                    })
            }

        } catch (error) {
            console.error("ERROR IN CHECK OUT INFO: ",error)
        }
    }

    const addAddressInfo = async(req,res)=>{
        try {
            const user = req.session.user
            const userId = await User.findById(user)

            if(userId){
                return res.render("addAddress",{user:userId})         
            }
            console.log("User not found in add address page !!!")

        } catch (error) {
            console.error("ERROR IN ADD ADDRESS FN",error)
        }
    }

    const addAddress = async (req, res) => {
        try {
            const  user  = req.session.user;

            if (!user) {
                return res.status(401).json({ message: "Unauthorized access. Please log in." });
            }
    
            const { title, street, city, state, pinCode, country } = req.body;
    
            if (!title || !street || !city || !state || !pinCode || !country) {
                return res.status(400).json({ message: "All fields are required." });
            }
    
            if (!/^\d{6}$/.test(pinCode)) {
                return res.status(400).json({ message: "Invalid pincode format. Must be 6 digits." });
            }
    
            const userAddresses = await Address.findOne({ userId: user });
    
            if (userAddresses) {
                
                userAddresses.addresses.push({
                    title,
                    street,
                    city,
                    state,
                    pinCode,
                    country
                });
                await userAddresses.save();

            } else {
                
                const newAddress = new Address({
                    userId: user,
                    addresses: [{
                        title,
                        street,
                        city,
                        state,
                        pinCode,
                        country
                    }]
                });
                await newAddress.save();
            }
    
            return res.status(200).json({ message: "Address added successfully." });
    
        } catch (error) {
            console.error("Error adding address:", error);
            res.status(500).json({ message: "Internal server error. Please try again later." });
        }
    };

    const editAddressInfo = async(req,res)=>{
       
        try {
            const {user} = req.session
            const userId = await User.findOne({_id:user})
            
            if(userId){

            const { id } = req.params; 
            const address = await Address.findOne({ "addresses._id": id },{ "addresses.$": 1 });
           
            if (!address) {
                return res.status(404).send("Address not found");
            }
    
            return res.render('editAddress', { address:address.addresses[0], user:userId }); 
            }

            console.log("User not found !!")
            
           
        } catch (error) {
            console.error("ERROR IN EDIT ADDRESS INFO PAGE: ",error);
            res.status(500).send("Server Error");
        }
    }

    const editAddress = async(req,res)=>{
        const {id} = req.params
        const {title,street,city,state,pinCode,country} = req.body

        try {
            const updatedAddress= await Address.updateOne(
                { "addresses._id": id }, 
                { $set: { 
                    "addresses.$.city": city,
                    "addresses.$.title": title,
                    "addresses.$.street":street,
                    "addresses.$.state": state,
                    "addresses.$.pinCode": pinCode,
                    "addresses.$.country": country
                } } 
              );
    
            if (!updatedAddress) {
                return res.status(404).json({ message: 'Address not found' });
            }
    
            res.status(200).json({ message: 'Address updated successfully', address: updatedAddress });
        } catch (error) {
            res.status(500).json({ message: 'Error updating address', error });
        }
    }
   
    const deleteAddress = async (req, res) => {
        try {
            const userId = req.session.user;
            const { id } = req.params;
    
            const del = await Address.updateOne(
                { userId, "addresses._id": id }, 
                { $set: { "addresses.$.deleted": true } } 
            );
    
            if (!del.modifiedCount) {
                return res.status(404).json({ success: false, message: 'Address not found' });
            }
    
            res.status(200).json({ success: true, message: 'Address removed successfully' });
        } catch (error) {
            console.error("ERROR IN DELETE FN", error);
            res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
        }
    };

    const addBillingAddress = async(req,res)=>{
        try {
            const  user  = req.session.user;
    
            if (!user) {
                return res.status(401).json({ message: "Unauthorized access. Please log in." });
            }
    
            const { title, street, city, state, pinCode, country } = req.body;
    
            if (!title || !street || !city || !state || !pinCode || !country) {
                return res.status(400).json({ message: "All fields are required." });
            }
    
            if (!/^\d{6}$/.test(pinCode)) {
                return res.status(400).json({ message: "Invalid pincode format. Must be 6 digits." });
            }
    
            const userAddresses = await Address.findOne({ userId: user });
    
            if (userAddresses) {
                
                userAddresses.addresses.push({
                    title,
                    street,
                    city,
                    state,
                    pinCode,
                    country
                });
                await userAddresses.save();

            } else {
                const newAddress = new Address({
                    userId: user,
                    addresses: [{
                        title,
                        street,
                        city,
                        state,
                        pinCode,
                        country
                    }]
                });
                await newAddress.save();
            }
    
            return res.status(200).json({ message: "Address added successfully." });
    
        } catch (error) {
            console.error("Error adding address:", error);
            res.status(500).json({ message: "Internal server error. Please try again later." });
        }
    }

  
module.exports = {
    addressPageInfo,
    addAddressInfo,
    addAddress,
    editAddressInfo,
    editAddress,
    deleteAddress,
    checkOutInfo,
    addBillingAddress,
    validCheck
};

