const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors({
  origin: [
    'http://localhost:5173',

    'https://food-donation-20653.web.app'
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ddlqajr.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

//middlewares
const logger = (req, res, next) => {
  console.log('log:info', req.method, req.url);
  next();
}

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  //console.log('token middleware', token);
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded;
    next();
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    //await client.connect();

    //add food collection
    const foodCollection = client.db("donationDB").collection("foods");

    //request food collection
    const requestCollection = client.db("donationDB").collection("request");

    //auth api
    app.post('/jwt', logger, async (req, res) => {
      const user = req.body;
      console.log('jwt', user)
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })

    //user logout cookies token delete
    app.post('/logout', async (req, res) => {
      const user = req.body;
      console.log('logout delete cookie', user)
      res.clearCookie('token', { maxAge: 0, secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict', }).send({ success: true });
    })

    //food
    app.get('/food', async (req, res) => {

      let queryObj = {}
      let sortObj = {}
      const foodName = req.query.foodName;
      const sortField = req.query.sortField;
      const sortOrder = req.query.sortOrder;
      if (foodName) {
        queryObj.foodName = foodName
      }

      if (sortField && sortOrder) {
        sortObj[sortField] = sortOrder;
      }

      const cursor = foodCollection.find(queryObj).sort(sortObj);
      const result = await cursor.toArray();
      res.send(result);
    })

    app.post('/food', async (req, res) => {
      const foodInfo = req.body;
      console.log(foodInfo)
      const result = await foodCollection.insertOne(foodInfo)
      res.send(result);
    })

    // get specific data to id
    app.get('/food/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id)
      const query = { _id: new ObjectId(id) };
      const result = await foodCollection.findOne(query);
      res.send(result);
    })

    //delete
    app.delete('/food/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id)
      const query = { _id: new ObjectId(id) }
      const result = await foodCollection.deleteOne(query);
      res.send(result);
    })

    //update
    app.put('/food/:id', async (req, res) => {
      const id = req.params.id;
      console.log("Id", id)
      const query = { _id: new ObjectId(id) }
      console.log("query", query);
      const options = { upsert: true };
      const updateFoodInfo = req.body;
      const updateFood = {
        $set: {
          image_url: updateFoodInfo.image_url, name: updateFoodInfo.name, foodName: updateFoodInfo.foodName, status: updateFoodInfo.status, notes: updateFoodInfo.notes, quantity: updateFoodInfo.quantity, location: updateFoodInfo.location, DImage_url: updateFoodInfo.DImage_url, date: updateFoodInfo.date, D_email: updateFoodInfo.D_email
        }
      }
      console.log('update food', updateFood)

      const result = await foodCollection.updateOne(query, updateFood, options);
      console.log('result', result)
      res.send(result);
    })

    //add request data
    app.post('/requestFood', async (req, res) => {
      const result = await requestCollection.insertOne(req.body);
      res.send(result);
    })

    //get request data
    app.get('/requestFood', logger, verifyToken, async (req, res) => {
      console.log(req.query.email)
      console.log('owner', req.user)
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await requestCollection.find(query).toArray();
      res.send(result);
    })

    // get specific data to id
    app.get('/requestFood/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id)
      const query = { _id: new ObjectId(id) };
      const result = await requestCollection.findOne(query);
      res.send(result);
    })

    //cancel
    app.delete('/requestFood/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id)
      const query = { _id: new ObjectId(id) }
      const result = await requestCollection.deleteOne(query);
      res.send(result);
    })


    //update status
    app.put('/updateRequestStatus/:id', async (req, res) => {
      const id = req.params.id;
      const updateStatus = req.body.status;

      // Update the status field in the database
      const result = await foodRequestCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: updateStatus } }
      );

      res.send(result);
    });



    // Send a ping to confirm a successful connection
    //await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('food donation running')
})

app.listen(port, () => {
  console.log(`food donation server is running port ${port}`)
})