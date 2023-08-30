const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// Set the environment variable to specify the saslprep library
process.env.SASL_PREP_LIB = require.resolve("saslprep");

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
    const userCollection = client.db("i-library").collection("users");
    const requestedBooks = client.db("i-library").collection("requested-books");
    const cartsCollection = client.db("i-library").collection("carts");
    const wishListCollection = client.db("i-library").collection("wishList");
    const donatedBooks = client.db("i-library").collection("donated-books");
    const allBlogsCollection = client
      .db("i-library")
      .collection("allBlogsCollection");
    const reviewCollection = client.db("i-library").collection("reviews");
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // user api
    app.post("/users", async (req, res) => {
      const user = req.body;

      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "user already exists" });
      }
      const result = await userCollection.insertOne(user);
      return res.send(result);
    });
    // book api
    app.get("/books", async (req, res) => {
      const books = await bookCollection.find().toArray();
      res.send(books);
    });
    app.get("/book/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const books = await bookCollection.findOne(query);
      res.send(books);
    });
    app.get("/books/category", async (req, res) => {
      try {
        const projection = {
          category: 1,
        };
        const result = await bookCollection
          .find()
          .project(projection)
          .toArray();

        const uniqueCategories = [
          ...new Set(result.map((book) => book.category)),
        ];

        const categoryCounts = uniqueCategories.map((category) => {
          const count = result.filter(
            (book) => book.category === category
          ).length;
          return {
            category,
            count,
          };
        });

        res.send(categoryCounts);
      } catch (error) {
        console.error("Error:", error);
        res.status(500).send("An error occurred.");
      }
    });
    app.get("/books/author", async (req, res) => {
      try {
        const projection = {
          author: 1,
        };
        const result = await bookCollection
          .find()
          .project(projection)
          .toArray();

        const uniqueAuthor = [...new Set(result.map((book) => book.author))];

        const authorCounts = uniqueAuthor.map((author) => {
          const count = result.filter((book) => book.author === author).length;
          return {
            author,
            count,
          };
        });

        res.send(authorCounts);
      } catch (error) {
        console.error("Error:", error);
        res.status(500).send("An error occurred.");
      }
    });
    app.get("/books/publisher", async (req, res) => {
      try {
        const projection = {
          publisher: 1,
        };
        const result = await bookCollection
          .find()
          .project(projection)
          .toArray();

        const uniquePublisher = [
          ...new Set(result.map((book) => book.publisher)),
        ];

        const publisherCounts = uniquePublisher.map((publisher) => {
          const count = result.filter(
            (book) => book.publisher === publisher
          ).length;
          return {
            publisher,
            count,
          };
        });

        res.send(publisherCounts);
      } catch (error) {
        console.error("Error:", error);
        res.status(500).send("An error occurred.");
      }
    });

    app.get("/books/category-filter", async (req, res) => {
      const categoryNames = req.query.categories.split(","); // Split categories by comma
      const query = { category: { $in: categoryNames } };

      try {
        const books = await bookCollection.find(query).toArray();
        res.send(books);
      } catch (error) {
        console.error("Error:", error);
        res.status(500).send("An error occurred.");
      }
    });

    app.get("/books/author/:authorName", async (req, res) => {
      const authorName = req.params.authorName;
      const query = { author: authorName };

      try {
        const books = await bookCollection.find(query).toArray();
        res.send(books);
      } catch (error) {
        console.error("Error:", error);
        res.status(500).send("An error occurred.");
      }
    });
    app.get("/books/publisher/:publisherName", async (req, res) => {
      const publisherName = req.params.publisherName;
      const query = { publisher: publisherName };

      try {
        const books = await bookCollection.find(query).toArray();
        res.send(books);
      } catch (error) {
        console.error("Error:", error);
        res.status(500).send("An error occurred.");
      }
    });

    // requested books
    app.get("/requested-books", async (req, res) => {
      const email = req.query.email;
      const filter = {
        userEmail: email,
      };
      const result = await requestedBooks.find(filter).toArray();
      res.send(result);
    });
    app.post("/requested-books", async (req, res) => {
      const book = req.body;
      const result = await requestedBooks.insertOne(book);
      res.send(result);
    });
    // doanted books
    app.get("/donated-books", async (req, res) => {
      const email = req.query.email;
      const filter = {
        userEmail: email,
      };
      const result = await donatedBooks.find(filter).toArray();
      res.send(result);
    });
    app.post("/donated-books", async (req, res) => {
      const book = req.body;
      const result = await donatedBooks.insertOne(book);
      res.send(result);
    });

    // route for get Popular Books
    app.get("/popular-books", async (req, res) => {
      const sort = { total_read: -1 };
      // const query = { status: 'approved' }
      const result = await bookCollection.find().sort(sort).limit(12).toArray();
      res.send(result);
    });

    // cart related api

    // route for get new Books
    app.get("/new-books", async (req, res) => {
      const sort = { added_date: -1 };
      const result = await bookCollection.find().sort(sort).limit(12).toArray();
      res.send(result);
    });

    // cart related api
    // route for get Cart data
    app.get("/carts", async (req, res) => {
      const { email } = req.query;
      const query = { userEmail: email };
      const result = await cartsCollection.find(query).toArray();
      res.send(result);
    });

    //api for add items in cart
    app.post("/carts", async (req, res) => {
      const cart = req.body;
      // console.log(cart)
      const query = { userEmail: cart.userEmail, bookId: cart.bookId };
      const alreadyAdded = await cartsCollection.findOne(query);
      if (alreadyAdded) {
        return res.send({ message: "already added" });
      }
      const result = await cartsCollection.insertOne(cart);
      res.send(result);
    });

    //api for DELETE items from cart
    app.delete("/carts", async (req, res) => {
      const cart = req.body;
      // console.log(cart)
      const query = { userEmail: cart.userEmail, bookId: cart.bookId };
      const result = await cartsCollection.deleteOne(query);
      res.send(result);
    });

    // wish list related api

    // wish list related api
    //api for add items in wish list
    app.post("/wish-list", async (req, res) => {
      const wishList = req.body;
      // console.log(wishList)
      const query = { userEmail: wishList.userEmail, bookId: wishList.bookId };
      const alreadyAdded = await wishListCollection.findOne(query);
      if (alreadyAdded) {
        return res.send({ message: "already added" });
      }
      const result = await wishListCollection.insertOne(wishList);
      res.send(result);
    });

    // route for get wish list data
    app.get("/wish-list", async (req, res) => {
      const { email } = req.query;
      const query = { userEmail: email };
      const result = await wishListCollection.find(query).toArray();
      res.send(result);
    });

    //api for DELETE items from wish list
    app.delete("/wish-list", async (req, res) => {
      const wishList = req.body;
      // console.log(wishList)
      const query = { userEmail: wishList.userEmail, bookId: wishList.bookId };
      const result = await wishListCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/reviews/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const reviews = await reviewCollection.find(query).toArray();
      res.send(reviews);
    });

    app.get("/blogs", async (req, res) => {
      const page = parseInt(req.query.page);
      const limit = parseInt(req.query.limit);
      const skip = page * limit;
      const result1 = await allBlogsCollection
        .find()
        .skip(skip)
        .limit(limit)
        .toArray();
      const result2 = await allBlogsCollection.estimatedDocumentCount();

      res.send([result1, result2]);
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
