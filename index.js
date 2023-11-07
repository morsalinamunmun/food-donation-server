const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ddlqajr.mongodb.net/?retryWrites=true&w=majority`;

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
    //await client.connect();

    //add food collection
    const foodCollection = client.db("donationDB").collection("foods");

    //request food collection
    const requestCollection = client.db("donationDB").collection("request");

    app.get('/food', async(req, res)=>{
        const cursor = foodCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })

    app.post('/food', async(req, res)=>{
        const foodInfo = req.body;
        console.log(foodInfo)
        const result = await foodCollection.insertOne(foodInfo)
        res.send(result);
    })

    //add request data
    app.post('/requestFood', async(req, res)=>{
      const result = await requestCollection.insertOne(req.body);
      res.send(result);
    }) 

    //get request data
    app.get('/requestFood', async(req, res)=>{
      const cursor = requestCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    // get specific data to id
    app.get('/requestFood/:id', async(req, res)=>{
      const id = req.params.id;
      console.log(id)
      const query= {_id: new ObjectId(id)};
      const result = await requestCollection.findOne(query);
      res.send(result);
    })

    //cancel
    app.delete('/requestFood/:id', async(req, res)=>{
      const id = req.params.id;
      console.log(id)
      const query = {_id: new ObjectId(id)}
      const result = await requestCollection.deleteOne(query);
      res.send(result);
   })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res)=>{
    res.send('food donation running')
})

app.listen(port, ()=>{
    console.log(`food donation server is running port ${port}`)
})