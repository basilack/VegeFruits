const { response } = require('express');
var express = require('express');
const productHelpers = require('../helpers/product-helpers');
var router = express.Router();

/* GET users listing. */

router.get('/', function(req, res, next) {

  productHelpers.getAllProducts().then((products)=>{
    console.log(products)
    res.render('admin/view-products', {products, admin:true});
  })
  
});

router.get('/add-products', function(req, res, next) {
  res.render('admin/add-products',{admin:true});
});

router.post('/add-products', function(req, res) {
  // console.log(req.body);
  // console.log(req.files.image);     // the uploaded file object

  productHelpers.addProducts(req.body,(id)=>{
    let image = req.files.image
    console.log(id)
    image.mv('./public/product-images/'+id+'.jpg',(err)=>{
      if (!err)
      res.redirect('/admin')
      else
      console.log(err)
    })
    
  })

});

router.get('/deleteProducts/:id', function(req, res, next) {
  let proId = req.params.id
  console.log(proId)
  productHelpers.deleteProduct(proId).then((response)=>{
    res.redirect('/admin')
  })
});

router.get('/editProducts/:id', function(req, res, next) {
  productHelpers.getProductDetails(req.params.id).then((product)=>{

    res.render('admin/edit-products',{admin:true, product})
  })
  
});

router.post('/edit-products/:id', function(req, res, next) {
  productHelpers.updateProduct(req.params.id,req.body).then((product)=>{
   res.redirect('/admin')
   if(req.files.image){
     let image=req.files.image
    image.mv('./public/product-images/'+req.params.id+'.jpg')
   }
  })
  
});


module.exports = router;
