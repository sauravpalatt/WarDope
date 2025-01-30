const passport = require("passport")
const GoogleStrategy = require("passport-google-oauth20").Strategy
const User = require("../models/userSchema")
const env = require("dotenv").config()

passport.use(new GoogleStrategy({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret :process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:"/auth/google/callback",
},

async(accessToken,refreshToken,profile,done)=>{
    try {
        let googleEmail= profile.emails?.[0]?.value
        let user = await User.findOne({email:googleEmail})
        
        if(user && !user.googleId){
            user.googleId = profile.id;
            await user.save();
            return done(null,user)
        }else if(user){
            return done(null,user)
        }else{
            user = new User({
                name:profile.displayName,
                email:googleEmail,
                googleId:profile.id,
            })
            await user.save()

            return done(null,user)
        }
    } catch (error) {
        
        return done(error,null)
    }
}
))

passport.serializeUser((user, done) => {
    done(null, user.id); 
});

passport.deserializeUser((id, done) => {
    User.findById(id)
        .then(user => {
            done(null, user); 
        })
        .catch(err => {
            done(err, null);
        });
});
 
module.exports = passport
