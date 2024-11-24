
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

module.exports={loadHomePage,pageNotFound}