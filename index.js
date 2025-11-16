const express = require('express');
const cors = require('cors');
require('dotenv').config()
const app=express();
const port=process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

app.get('/',(req,res)=>{
    res.send('import-export-hub server is running');
});

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gpbclj8.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const db=client.db('ImportExportHubDB');
    const productsCollection=db.collection('products');
    const importsCollection=db.collection('imports');
    // Products APIs
    app.get('/latest-products',async(req,res)=>{
        const cursor=productsCollection.find().sort({createdAt:-1}).limit(6);
        const result=await cursor.toArray();
        res.send(result);
    });
    app.get('/products',async(req,res)=>{
    const email=req.query.email;
    const query={};
    if(email)
    {
        query.exporterEmail=email;
    }
        const cursor=productsCollection.find(query);
        const result=await cursor.toArray();
        res.send(result);
    });
    app.get('/products/:id',async(req,res)=>{
        const id=req.params.id;
        const query={_id:new ObjectId(id)};
        const result=await productsCollection.findOne(query);
        res.send(result);
    })
    app.post('/products',async(req,res)=>{
        // console.log('products post api hitted');
        const newProduct=req.body;
        // console.log('new Product:',newProduct);
        const result=await productsCollection.insertOne(newProduct);
        res.send(result);

    })
    // import related APIs
    app.get('/imports',async(req,res)=>{
        const email=req.query.email;
        const query={};
        if(email)
        {
            query.importerEmail=email;
        }
        const cursor=importsCollection.find(query);
        const result=await cursor.toArray();
        res.send(result);
    })
    app.get('/imports/:id',async(req,res)=>{
        const id=req.params.id;
        const query={_id:new ObjectId(id)};
        const result=await importsCollection.findOne(query);
        res.send(result);
    })
    app.post('/imports',async(req,res)=>{
        const newImport=req.body;
        const {productId,importedQuantity}=newImport;
        const existingImportedProduct=await importsCollection.findOne({productId:productId});
        let result;
        if(existingImportedProduct)
        {
            const queryProdId={productId:productId};
            const update={
                $inc:{
                    importedQuantity:+importedQuantity
                }
            }
    result=await importsCollection.updateOne(queryProdId,update)
        }
        else{
            result=await importsCollection.insertOne(newImport);
        }
        const query={_id:new ObjectId(productId)};
        const update={
            $inc:{
                availableQuantity:-importedQuantity
            }
        }
        const updateProductsResult=await productsCollection.updateOne(query,update);
        
        res.send(result);
    })
    app.post('/imports/:id',async(req,res)=>{
        const id=req.params.id;
        const query={_id:new ObjectId(id)};
        const eachImport=req.body;
        // console.log(eachImport);
        const {productId,importedQuantity}=eachImport;
        const queryForUpdateQuantity={_id:new ObjectId(productId)};
        const update={
            $inc:{
                availableQuantity:+importedQuantity
            }
        }
        const updateProductsResult=await productsCollection.updateOne(queryForUpdateQuantity,update);
        const result=await importsCollection.deleteOne(query);
        res.send(result);
    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port,()=>{
    console.log(`server is running at port: ${port}`);
})