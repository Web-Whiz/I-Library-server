const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// Set the environment variable to disable saslprep warnings
process.env.MONGOMS_DISABLE_SASLPREP = "1";

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
   
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    app.get("/books", async (req, res) => {
      const books = await bookCollection.find().toArray();
      res.send(books);
    });

    // ------------------searchText-----------------------//
    app.post("/books", async (req, res) => {
      const Addededbook=req.body
      const result = await bookCollection.insertOne(Addededbook)
      res.send(result);
    });

    // ------------------searchText-----------------------//
    const indexKeys = { title: 1 };
    const indexOptions = { name: "titlesearch" };
    const result = await bookCollection.createIndex(indexKeys,indexOptions );

    app.get("/books/:text", async (req, res) => {
      const searchText = req.params.text;
      const result = await bookCollection
        .find({
          $or: [{ title: { $regex: searchText, $options: "i" } }],
        })
        .toArray();
      res.send(result);
    });

// ------------------Update-----------------------//

    app.patch("/books/:id", async (req, res) => {
      const id = req.params.id;
      const Clientdata=req.body;
      const filter = { _id: new ObjectId(id) }
      const updatetoydata ={
          $set:{
              title:Clientdata.title,
              author:Clientdata.author,
              translator:Clientdata.translator || null,
              publisher:Clientdata.publisher,
              shelf:parseFloat(Clientdata.shelf),
              image_url:Clientdata.image_url,
              edition:Clientdata.edition,
              published_in:parseFloat(Clientdata.published_in),
              category:Clientdata.category,
              number_of_pages:parseFloat(Clientdata.number_of_pages),
              language:Clientdata.language,
              country:Clientdata.country,
              // ratings:Clientdata.ratings,
              // total_read:Clientdata.total_read,
              added_date:Clientdata.added_date,
              hard_copy:Clientdata.hard_copy,
              pdf:Clientdata.pdf,
              ebook:Clientdata.ebook,
              pdf_link:Clientdata.pdf_link,
           

          }
        }
      const result = await bookCollection.updateOne(filter,updatetoydata)
      res.send(result)
  })


// ------------------Delete-----------------------//
    app.delete('/books/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await bookCollection.deleteOne(query)
      res.send(result)
  })



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
