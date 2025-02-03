const express = require ("express")
const app = express()
const path = require("path")
const session = require("express-session")
const env = require("dotenv").config()
const passport = require("./config/passport")
const userRouter = require("./routes/userRouter")
const adminRouter = require("./routes/adminRouter")
const db = require ("./config/db")
const MongoConnect = require("connect-mongo")
const nocache = require('nocache')
db()

app.use(express.json({limit: '50mb'}))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false, 
    cookie: {
        secure: false, 
        httpOnly: true, 
        maxAge: 72 * 60 * 60 * 1000 
    },
    store: new MongoConnect({
        mongoUrl: process.env.MONGODB_URI
    })
 }));

app.use(nocache())

app.set("view engine","ejs")
app.set("views",[path.join(__dirname,"views/user"),path.join(__dirname,"views/admin")])
app.use(express.static(path.join(__dirname,"public")))

app.use("/",userRouter)
app.use("/admin",adminRouter)

app.use((req,res)=>{
    res.status(404).render("page_404")
})

app.use(passport.initialize())
app.use(passport.session())


app.listen(process.env.PORT,()=>{
    console.log(`server is listennig...`)
})

module.exports=app