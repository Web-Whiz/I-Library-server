const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const SSLCommerzPayment = require("sslcommerz-lts");
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

const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASSWORD;
const is_live = false; //true for live, false for sandbox

async function run() {
  try {
    const bookCollection = client.db("i-library").collection("books");
    const cartsCollection = client.db("i-library").collection("carts");
    const wishListCollection = client.db("i-library").collection("wishList");
    const ordersCollection = client.db("i-library").collection("orders");
    const usersCollection = client.db("i-library").collection("users");

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    app.get("/books", async (req, res) => {
      const books = await bookCollection.find().toArray();
      res.send(books);
    });



    //payment Route
    app.post("/order", async (req, res) => {
      console.log(req.body);

      const mail = "muhammadformaanali@gmail.com";

      const result = await cartsCollection.find({ userEmail: mail }).toArray();
      console.log(result);

      const orderedBooks = result.map((book) => {
        const { bookId, title, author, image_url } = book;
        const orderedItem = {
          title,
          bookId,
          author,
          image_url,
        };
        return orderedItem;
      });
      console.log(orderedBooks);
      const tran_id = new ObjectId().toString();

      const data = {
        total_amount: 100,
        currency: "BDT",
        tran_id: tran_id, // use unique tran_id for each api call
        success_url: `http://localhost:5000/payment/success/${tran_id}`,
        fail_url: `http://localhost:5000/payment/failed/${tran_id}`,
        cancel_url: "http://localhost:3030/cancel",
        ipn_url: "http://localhost:3030/ipn",
        shipping_method: "Courier",
        product_name: "Computer.",
        product_category: "Electronic",
        product_profile: "general",
        cus_name: "Customer Name",
        cus_email: "customer@example.com",
        cus_add1: "Dhaka",
        cus_add2: "Dhaka",
        cus_city: "Dhaka",
        cus_state: "Dhaka",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        cus_phone: "01711111111",
        cus_fax: "01711111111",
        ship_name: "Customer Name",
        ship_add1: "Dhaka",
        ship_add2: "Dhaka",
        ship_city: "Dhaka",
        ship_state: "Dhaka",
        ship_postcode: 1000,
        ship_country: "Bangladesh",
      };

      // console.log(data)

      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
      sslcz.init(data).then((apiResponse) => {
        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL;
        res.send({ url: GatewayPageURL });

        const finalOrder = {
          mail,
          orderedBooks,
          paidStatus: "unpaid",
          transactionId: tran_id,
        };

        const result = ordersCollection.insertOne(finalOrder);
        console.log("Redirecting to: ", GatewayPageURL);
      });

      app.post("/payment/success/:tranId", async (req, res) => {
        // console.log(req.params.tranId)
        const result = await ordersCollection.updateOne(
          { transactionId: req.params.tranId },
          {
            $set: {
              paidStatus: "paid",
            },
          }
        );
        if (result.modifiedCount > 0) {
          const deleteCart = await cartsCollection.deleteMany({
            userEmail: mail,
          });
          res.redirect("http://localhost:3000/dashboard/cart/payment-success");
        }
      });

      app.post("/payment/failed/:tranId", async (req, res) => {
        // console.log(req.params.tranId)
        const result = await ordersCollection.deleteOne({
          transactionId: req.params.tranId,
        });
        if (result.deletedCount > 0) {
          res.redirect("http://localhost:3000/dashboard/cart/payment-failed");
        }
      });
    });




    // route for get all users data 
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });



    // route for get Popular Books
    app.get("/popular-books", async (req, res) => {
      const sort = { total_read: -1 };
      // const query = { status: 'approved' }
      const result = await bookCollection.find().sort(sort).limit(12).toArray();
      res.send(result);
    });

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
