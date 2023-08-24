const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// Set the environment variable to specify the saslprep library
process.env.SASL_PREP_LIB = require.resolve('saslprep');  

// middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Welcome to the I Library!!");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nqvtzm8.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const bookCollection = client.db("i-library").collection("books");
    const requestedBooks = client.db("i-library").collection("requested-books");
    const cartsCollection = client.db("i-library").collection("carts");
    const wishListCollection = client.db("i-library").collection("wishList");

    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    app.get("/books", async (req, res) => {
      const books = await bookCollection.find().toArray();
      res.send(books);
    });

    // requested books
    app.get("/requested-books", async (req, res) => {
      const email = req.query.email;
      const filter = {
        userEmail: email,
      };
      const result = await requestedBooks.find(filter ).toArray();
      res.send(result);
    });
    app.post("/requested-books", async (req, res) => {
      const book = req.body;
      const result = await requestedBooks.insertOne(book);
      res.send(result);
    });



    // route for get Popular Books
    app.get('/popular-books', async (req, res) => {
      const sort = { total_read: -1 }
      // const query = { status: 'approved' }
      const result = await bookCollection.find().sort(sort).limit(12).toArray()
      res.send(result);

    })



    // cart related api 
    // route for get Cart data
    app.get('/carts', async (req, res) => {
      const { email } = req.query;
      const query = { userEmail: email }
      const result = await cartsCollection.find(query).toArray()
      res.send(result);

    })

    //api for add items in cart
    app.post('/carts', async (req, res) => {
      const cart = req.body;
      // console.log(cart)
      const query = { userEmail: cart.userEmail, bookId: cart.bookId }
      const alreadyAdded = await cartsCollection.findOne(query);
      if (alreadyAdded) {
        return res.send({ message: 'already added' })
      }
      const result = await cartsCollection.insertOne(cart);
      res.send(result);
    });


    //api for DELETE items from cart
    app.delete('/carts', async (req, res) => {
      const cart = req.body;
      // console.log(cart)
      const query = { userEmail: cart.userEmail, bookId: cart.bookId }
      const result = await cartsCollection.deleteOne(query);
      res.send(result);
    });

    

    // wish list related api 
    //api for add items in wish list
    app.post('/wish-list', async (req, res) => {
      const wishList = req.body;
      // console.log(wishList)
      const query = { userEmail: wishList.userEmail, bookId: wishList.bookId }
      const alreadyAdded = await wishListCollection.findOne(query);
      if (alreadyAdded) {
        return res.send({ message: 'already added' })
      }
      const result = await wishListCollection.insertOne(wishList);
      res.send(result);
    });

    // route for get wish list data
    app.get('/wish-list', async (req, res) => {
      const { email } = req.query;
      const query = { userEmail: email }
      const result = await wishListCollection.find(query).toArray()
      res.send(result);

    })

    //api for DELETE items from wish list
    app.delete('/wish-list', async (req, res) => {
      const wishList = req.body;
      // console.log(wishList)
      const query = { userEmail: wishList.userEmail, bookId: wishList.bookId }
      const result = await wishListCollection.deleteOne(query);
      res.send(result);
    });


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`I Library is running on port ${port}`);
});
