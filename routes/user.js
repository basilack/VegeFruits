var express = require('express');
const req = require('express/lib/request');
const { status } = require('express/lib/response');
const async = require('hbs/lib/async');

const productHelpers = require('../helpers/product-helpers');
const userHelpers = require('../helpers/user-helpers');
var router = express.Router();

const verifyLogin=(req,res,next)=>{             //checking user is loggedin or not
  if(req.session.user.loggedIn){
    next()
  }
  else{
    res.redirect('/login')
  }
}

/* GET home page. */
router.get('/',async function(req, res, next) {

  let user= req.session.user
  let cartCount = null
  if(req.session.user){
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
 
  productHelpers.getAllProducts().then((products)=>{
    res.render('user/view-products', {products, admin:false ,user, cartCount});
  })
 
});

router.get('/login',function(req,res){

  if(req.session.user.loggedIn){           // if user already loggedin then dont want to go login page again
    res.redirect('/')
  }
  else{
    res.render('user/login',{"loginErr":req.session.userLoginErr})
    req.session.userLoginErr=false
  }
  
})

router.post('/login',function(req,res){

 userHelpers.doLogin(req.body).then((response)=>{
   if(response.status){

     
     req.session.user = response.user
     req.session.user.loggedIn = true
      res.redirect('/')
   }
   else{
     req.session.userLoginErr= true
     res.redirect('/login')
   }
 })
})

router.get('/register',function(req,res){
  res.render('user/register')
})

router.post('/register',function(req,res){

  userHelpers.doSignup(req.body).then((response)=>{
    
   
     req.session.user = response
     req.session.user.loggedIn = true
     res.redirect('/')
  })
  res.redirect('/login')
})

router.get('/logout',function(req,res){
  // req.session.destroy()
  req.session.user=null
  res.redirect('/login')
})

router.get('/cart',verifyLogin, async(req,res)=>{
  let products = await userHelpers.getCartItems(req.session.user._id)
  let user = req.session.user
  let total = 0
  if(products.length>0){
    total = await userHelpers.getTotalAmount(req.session.user._id)
  }
  
  res.render('user/cart',{products,user,total})
})

router.get('/add-to-cart/:id', function(req,res){
  
  userHelpers.addToCart(req.params.id,req.session.user._id).then(()=>{
    res.json({status:true})
  })
 
})

router.post('/change-product-quantity',function(req,res){
  userHelpers.changeQuantity(req.body).then(async(response)=>{
    response.total = await userHelpers.getTotalAmount(req.body.user)
    res.json(response)
    
  })
})

router.post('/delete-cart-product', (req,res)=>{
  
  userHelpers.removeCartProduct(req.body).then((response)=>{
    res.json(response)
  })
})

router.get('/place-order',verifyLogin,async function(req,res){
  let total = await userHelpers.getTotalAmount(req.session.user._id)
  res.render('user/place-order',{total,user:req.session.user})
})

router.post('/place-order',async (req,res)=>{
  let products = await userHelpers.getCartProductList(req.body.userId)  //session id will not get through ajax
  let totalPrice =  await userHelpers.getTotalAmount(req.body.userId)
 userHelpers.placeOrder(req.body,products,totalPrice).then((orderId)=>{
   
   if(req.body['payment-method']==='COD'){

      res.json({codSuccess:true})
   }
   else{
      userHelpers.generateRazorpay(orderId,totalPrice).then((response)=>{
          res.json(response)
      })
   }
   
 })
})

router.get('/order-success',verifyLogin,(req,res)=>{
  res.render('user/order-success', {admin:false,user:req.session.user})
})

router.get('/orders', async(req,res)=>{
  let orders= await userHelpers.getUserOrders(req.session.user._id)
  //console.log(orders)
  res.render('user/orders', {admin:false,user:req.session.user,orders})
})

router.get('/view-order-products/:id',verifyLogin,async(req,res)=>{
  let products = await userHelpers.getOrdersProducts(req.params.id)
  //console.log(products)
  res.render('user/view-order-products',{products})
})

router.post('/verify-payment',verifyLogin,async(req,res)=>{
  console.log(req.body);
  userHelpers.verifyPayment(req.body).then(()=>{
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(()=>{
      console.log("payment success");
      res.json({status:true})
    })
  }).catch((err)=>{
    console.log(err)
    res.json({status:false,errMsg:''})
  })
})

module.exports = router;
 