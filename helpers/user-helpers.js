const { USER_COLLECTIONS, CART_COLLECTIONS, PRODUCT_COLLECTIONS, ORDER_COLLECTION } = require('../config/collections')
const bcrypt = require('bcrypt')          //used for password encryption

var db = require('../config/connection')
const { ObjectId } = require('mongodb')
const { status } = require('express/lib/response')
const { reject, use } = require('bcrypt/promises')
const async = require('hbs/lib/async')

const Razorpay = require('razorpay');
var instance = new Razorpay({
    key_id: 'rzp_test_3SsX0g2zs6K23A',
    key_secret: 'FrNtG7R2dInnSkNkmqU3aVey',
  });



module.exports={

    doSignup:(userData)=>{
        
        return new Promise(async(resolve,reject)=>{

            userData.password = await bcrypt.hash(userData.password,10)
            db.get().collection(USER_COLLECTIONS).insertOne(userData).then((data)=>{
                
                    //resolve(data.ops[0])  
                    resolve(data)
            })
        })
       
    },

    doLogin:(userData)=>{
        
        return new Promise(async(resolve,reject)=>{
            let loginStatus= false
            let response = {}
            let user = await db.get().collection(USER_COLLECTIONS).findOne({email:userData.email})
            
            if(user)
            {
                
               bcrypt.compare(userData.password,user.password).then((status)=>{   //comparing both passwords
                //console.log(status)
                if(status){
                        console.log("Login Successful")
                        response.user = user
                        response.status= true
                        resolve(response)
                    }
                    else{
                        console.log("Login Failed")
                        resolve({status:false})
                    }
                })
            }
            else{
                console.log("Login Failed")
                resolve({status: false})
            }
        })

    },

    addToCart:(proId,userId)=>{
        let proObj={
            item:ObjectId(proId),
            quantity:1
        }
        return new Promise(async(resolve,reject)=>{
            let userCart = await db.get().collection(CART_COLLECTIONS).findOne({user:ObjectId(userId)})
            //console.log(userCart)
            if(userCart)
            {
                let proExist = userCart.products.findIndex(product=>product.item==proId)
                //console.log(proExist)
                if(proExist!=-1){
                    db.get().collection(CART_COLLECTIONS)
                    .updateOne({user:ObjectId(userId),'products.item':ObjectId(proId)},
                    {
                        $inc:{'products.$.quantity':1}
                    }).then(()=>{
                        resolve()
                    })
                }
                else{
                db.get().collection(CART_COLLECTIONS).
                updateOne({user:ObjectId(userId)},
                {
                    $push:{products:proObj}
                }
                ).then((response)=>{
                    resolve()
                })
                }
            }
            else{
                let cartObj = {
                    user:ObjectId(userId),
                    products:[proObj]
                }
                db.get().collection(CART_COLLECTIONS).insertOne(cartObj).then((response)=>{
                    resolve()
                })
            }
        })
    },

    getCartItems:(userId)=>{
        
        return new Promise(async(resolve,reject)=>{
            
            let cartItems = await db.get().collection(CART_COLLECTIONS).aggregate([
                {
                    $match : {user:ObjectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from: PRODUCT_COLLECTIONS,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{                                                                   //projecting to the 'product' array
                        item:1,quantity:1,product: {$arrayElemAt:['$product',0]}                  // representing which details are needed (if needed then 1)
                    }
                }
                // {
                //     $lookup:{
                //         from: PRODUCT_COLLECTIONS,
                //         let: {prodList:'$products'},
                //         pipeline:[
                //             {
                //                  $match:{
                //                     $expr:{
                //                         $in:['$_id','$$prodList']
                //                     }
                //             }
                //     }],
                //     as:'cartItems'
                //     }
                // }
            ]).toArray()
        
            resolve(cartItems)
        })
    },

    getCartCount:(userId)=>{

        return new Promise(async(resolve,reject)=>{
            let count = 0
            let cart = await db.get().collection(CART_COLLECTIONS).findOne({user:ObjectId(userId)})
            if(cart)
            {
                count = cart.products.length   //function used to find elements in a array
            }

            resolve(count)
        })
    },

    changeQuantity:(details)=>{
      
        return new Promise((resolve,reject)=>{
            count = parseInt(details.count)
            if(count==-1 && details.quantity==1){                             // only one product in the cart

                db.get().collection(CART_COLLECTIONS).updateOne({_id:ObjectId(details.cart)},
                {
                    $pull:{products:{item:ObjectId(details.product)}}           
                },
                ).then((response)=>{
                    resolve({removeProduct:true})
                })
            }
            else{

            db.get().collection(CART_COLLECTIONS)
                    .updateOne({_id:ObjectId(details.cart),'products.item':ObjectId(details.product)},
                    {
                        $inc:{'products.$.quantity':count}
                    }).then((response)=>{
                        //console.log(response)
                        resolve({status:true})
                    })
                }
        })
    
    },

    removeCartProduct:(details)=>{
        return new Promise((resolve,reject)=>{

            db.get().collection(CART_COLLECTIONS).updateOne({_id:ObjectId(details.cart)},
                {
                    $pull:{products:{item:ObjectId(details.product)}}           
                },
                ).then((response)=>{
                    resolve({removeProduct:true})
                })
        })
    },

    getTotalAmount:(userId)=>{

        return new Promise(async(resolve,reject)=>{
            
            let total = await db.get().collection(CART_COLLECTIONS).aggregate([
                {
                    $match : {user:ObjectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from: PRODUCT_COLLECTIONS,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{                                                                   //projecting to the 'product' array
                        item:1,quantity:1,product: {$arrayElemAt:['$product',0]}                  // representing which details are needed (if needed then 1)
                    }
                },
                {
                    $group:{
                        _id:null,
                        total:{$sum:{$multiply:[ {$toInt : '$quantity'}, {$toInt :'$product.price'}]}}
                    }
                }
               
            ]).toArray()

           
                resolve(total[0].total)
           
            
            
        })
    },

    getCartProductList:(userId)=>{
         return new Promise(async(resolve,reject)=>{
             let cart = await db.get().collection(CART_COLLECTIONS).findOne({user:ObjectId(userId)})
             resolve(cart.products)
         })
    },

    placeOrder:(order,products,total)=>{
        return new Promise((resolve,reject)=>{
            let status = order['payment-method'] ==='COD'?'placed':'pending'        //like if-else
            let orderObj = {
                userId:ObjectId(order.userId),
                deliveryDetails:{

                    address:order.address,
                    city:order.city,
                    state:order.state,
                    pincode:order.pincode,
                    country:order.country,
                    mobile:order.mobile
                },
                products:products,
                totalAmount:total,
                paymentMethod:order['payment-method'],
                status:status,
                date: new Date().toISOString().slice(0, 19).replace('T', ' ')
            }

            db.get().collection(ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
                db.get().collection(CART_COLLECTIONS).remove({user:ObjectId(order.userId)})
                //console.log(response.insertedId)
                resolve(response.insertedId)
            })
        })
    },

    getUserOrders:(userId)=>{
        
        return new Promise(async(resolve,reject)=>{
            let orders = await db.get().collection(ORDER_COLLECTION).find({userId:ObjectId(userId)}).toArray()
            //console.log(orders)
            resolve(orders)
        })
    },

    getOrdersProducts:(orderId)=>{
       
        return new Promise(async(resolve,reject)=>{
            let orderItems = await db.get().collection(ORDER_COLLECTION).aggregate([
                {
                    $match : {_id:ObjectId(orderId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from: PRODUCT_COLLECTIONS,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{                                                                   //projecting to the 'product' array
                        item:1,quantity:1,product: {$arrayElemAt:['$product',0]}                  // representing which details are needed (if needed then 1)
                    }
                }
               
            ]).toArray()
            //console.log(orderItems)
            resolve(orderItems)
        })

    },

    generateRazorpay:(orderId,totalPrice)=>{
        console.log(totalPrice)
        return new Promise((resolve,reject)=>{
                
                    instance.orders.create({
                    amount: totalPrice*100,
                    currency: "INR",
                    receipt: ""+orderId,
                    

            
                }, function(err, order){
                    if(err)
                    {
                        console.log(err)
                    }
                    else{
                        console.log("New Order :", order)
                     resolve(order)
                    }
                    
                })

                
        })
    },

    verifyPayment:(details)=>{
        return new Promise((resolve,reject)=>{
            crypto = require('crypto');
            let hmac = crypto.createHmac('sha256', 'FrNtG7R2dInnSkNkmqU3aVey')

            hmac.update(details['payment[razorpay_order_id]']+'|'+ details['payment[razorpay_payment_id]'])
            hmac = hmac.digest('hex')
            if(hmac==details['payment[razorpay_signature]']){
                resolve()
            }
            else{
                reject()
            }
        })
    },

    changePaymentStatus:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(ORDER_COLLECTION).updateOne({_id:ObjectId(orderId)},
            {
                $set:{
                    status:'placed'
                }
            }).then(()=>{
                resolve()
            })
        })
    }

}