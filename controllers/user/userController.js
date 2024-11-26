
const pageNotFound = async(req,res)=>{
    try {
        res.render("page_404")
        
    } catch (error) {
      res.redirect("/pagenotfound")  
    }
}

const loadHomePage = async(req,res)=>{
    try {
        return res.render("home")
        
    } catch (error) {
        console.log("Home page not rendered")
        res.status(500).send("home page error occured")
    }
}

const signUpLoader = async(req,res)=>{
 try {
    return res.render("signup")
 } catch (error) {
    console.log("Sign up page load error",error)
    res.status(404).send("Sign up page not rendered")
 }
}

const logInLoader = async(req,res)=>{
    try {
        return res.render("login")
    } catch (error) {
        console.log("Log In Error",error)
        res.status(404).send("Log in Page not Found")
    }
}

module.exports={loadHomePage,pageNotFound,signUpLoader,logInLoader}