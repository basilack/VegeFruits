
const { ObjectId } = require('mongodb')
const { PRODUCT_COLLECTIONS } = require('../config/collections')
var db = require('../config/connection')


module.exports={

    addProducts:(product,callback)=>{
        //console.log(product)
        db.get().collection(PRODUCT_COLLECTIONS).insertOne(product).then((data)=>{
            console.log(data)
                //callback(data.ops[0]._id)  
              callback(data)
        })
    },

    getAllProducts:()=>{
        return new Promise(async(resolve,reject)=>{
            let products = await db.get().collection(PRODUCT_COLLECTIONS).find({IsDeleted:"0"}).toArray()  //'toArray'  used for covert collection of data to array
            resolve(products)
        })
    },

    deleteProduct:(proId)=>{

        return new Promise((resolve,reject)=>{
             db.get().collection(PRODUCT_COLLECTIONS).updateOne({_id:ObjectId(proId)},{$set:{IsDeleted:"1"}}).then((response)=>{
                    resolve(response)
             })
            
        })
    },

    getProductDetails:(proId)=>{

        return new Promise((resolve,reject)=>{
             db.get().collection(PRODUCT_COLLECTIONS).findOne({_id:ObjectId(proId)}).then((response)=>{
                    resolve(response)
             })
            
        })
    },

    updateProduct:(proId,proDetails)=>{

        return new Promise((resolve,reject)=>{
             db.get().collection(PRODUCT_COLLECTIONS)
             .updateOne({_id:ObjectId(proId)},{ 
                 $set:{
                    Barcode:proDetails.Barcode,
                     name:proDetails.name,
                     price:proDetails.price,
                     category:proDetails.category,
                     description:proDetails.description,
                     IsDeleted:"0"
                 }
             }).then((response)=>{
                    resolve(response)
             })
            
        })
    }
} 