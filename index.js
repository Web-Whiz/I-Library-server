const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const SSLCommerzPayment = require("sslcommerz-lts");
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

const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASSWORD;
const is_live = false; //true for live, false for sandbox

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
    const QACollection = client.db("i-library").collection("qa");
    const ordersCollection = client.db("i-library").collection("orders");
    const usersCollection = client.db("i-library").collection("users");
    const authorCollection = client.db("i-library").collection("authors");

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

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
        //payment Route
        // ToDo: have to receive data from front-end
        app.post("/order", async (req, res) => {

          const mail = "muhammadformaanali@gmail.com";

          const result = await cartsCollection
            .find({ userEmail: mail })
            .toArray();

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
          // console.log(orderedBooks);
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
          });

          app.post("/payment/success/:tranId", async (req, res) => {
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
              res.redirect(
                "http://localhost:3000/dashboard/cart/payment-success"
              );
            }
          });

          app.post("/payment/failed/:tranId", async (req, res) => {
            // console.log(req.params.tranId)
            const result = await ordersCollection.deleteOne({
              transactionId: req.params.tranId,
            });
            if (result.deletedCount > 0) {
              res.redirect(
                "http://localhost:3000/dashboard/cart/payment-failed"
              );
            }
          });
        });

        // route for get all users data
        app.get("/users", async (req, res) => {
          const result = await usersCollection.find().toArray();
          res.send(result);
        });

        // Route for update user role
        app.put("/users/update-role/:userId", async (req, res) => {
          const { userId } = req.params;
          const { updatedRole } = req.body;
          const query = { _id: new ObjectId(userId) };
          const option = { upsert: true };
          const updateOperation = {
            $set: { role: updatedRole },
          };
          const updateResult = await usersCollection.updateOne(
            query,
            updateOperation,
            option
          );
          res.send(updateResult);
        });

        // Route for update status
        app.put("/users/update-status/:userId", async (req, res) => {
          const { userId } = req.params;
          const { updatedStatus } = req.body;
          const query = { _id: new ObjectId(userId) };
          const option = { upsert: true };
          const updateOperation = {
            $set: { status: updatedStatus },
          };
          const updateResult = await usersCollection.updateOne(
            query,
            updateOperation,
            option
          );
          res.send(updateResult);
        });

        // route for warning
        app.put("/users/warning/:userId", async (req, res) => {
          const { userId } = req.params;
          const { warning } = req.body;
          const query = { _id: new ObjectId(userId) };
          const option = { upsert: true };
          const updateOperation = {
            $set: { warning: warning },
          };
          const updateResult = await usersCollection.updateOne(
            query,
            updateOperation,
            option
          );
          res.send(updateResult);
        });

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
    app.get("/books/category-filter", async (req, res) => {
      const categoryNames = req.query.categories.split(",");
      const query = { category: { $in: categoryNames } };

      try {
        const books = await bookCollection.find(query).toArray();
        res.send(books);
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

    app.get("/books/author-filter", async (req, res) => {
      const authorNames = req.query.authors.split(",");
      const query = { author: { $in: authorNames } };

      try {
        const books = await bookCollection.find(query).toArray();
        res.send(books);
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
    app.get("/books/publisher-filter", async (req, res) => {
      const publisherNames = req.query.publishers.split(",");
      const query = { publisher: { $in: publisherNames } };

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

    // Authors API
    app.get('/authors', async(req, res) => {
      const authors = await authorCollection.find().toArray();
      res.send(authors)
    })

    app.get("/author/:id", async(req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const author = await authorCollection.findOne(filter)
      res.send(author);
    })

    // Ratings & Reviews Related API
    app.get("/review/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { "book-id": id };
      const reviews = await reviewCollection.find(filter).toArray();
      res.send(reviews);
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
    app.post("/reviews", async (req, res) => {
      const {
        username,
        rating,
        review,
        date,
        bookTitle,
        bookImg,
        bookId,
        email,
      } = req.body;
      // console.log(req.body);

      try {
        // Insert the new review
        await reviewCollection.insertOne({
          username,
          rating,
          review,
          date,
          "book-name": bookTitle,
          "book-img": bookImg,
          "book-id": bookId,
          email,
        });

        res.status(201).json({ message: "Review submitted successfully!" });
      } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Failed to submit review." });
      }
    });

    // Book Questions & Answers Related API
    app.get("/qa", async(req, res) => {
      const result = await QACollection.find().toArray();
      res.send(result);
    });

    app.get("/qa/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { "book-id": id };
      const qa = await QACollection.find(filter).toArray();
      res.send(qa);
    });

    app.post("/qa", async (req, res) => {
      const { username, question, date, bookTitle, bookImg, bookId, email } =
        req.body;
      // console.log(req.body);

      try {
        // Insert the new QA
        await QACollection.insertOne({
          username,
          question,
          answer: "",
          "answered-by": "",
          "answered-date": "",
          date,
          "book-name": bookTitle,
          "book-img": bookImg,
          "book-id": bookId,
          email,
        });

        res.status(201).json({ message: "Question submitted successfully!" });
      } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Failed to submit question." });
      }
      res.send(result);
    });

    app.patch("/qa/:id", async (req, res) => {
      const id = req.params.id;
      const data= req.body;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updateDoc ={
          $set:{
            answer: data.answer,
            "answered-by": data.name,
            "answered-date": data.date,
          }
        }
      const result = await QACollection.updateOne(filter,updateDoc, options);
      res.send(result)
  })

    //api for DELETE items from wish list
    app.delete("/wish-list", async (req, res) => {
      const wishList = req.body;
      // console.log(wishList)
      const query = { userEmail: wishList.userEmail, bookId: wishList.bookId };
      const result = await wishListCollection.deleteOne(query);
      res.send(result);
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
