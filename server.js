const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/database");

dotenv.config();

const app = express();

// Connecting to MongoDB database
connectDB();

// Middleware
app.use(cors()); // enabling CORS – allowing frontend and backend to communicate with one another
app.use(express.json());

// Routing requests
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/books", require("./routes/books"));
app.use("/api/reviews", require("./routes/reviews"));
app.use("/api/friends", require("./routes/friendships"));
app.use("/api/readinglists", require("./routes/readinglists"));

app.get("/", (req, res) => {
	res.send("BookShelf API is running");
});

// Error handling middlware
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).send({message: "Server Error", error: err.message});
});

// Starting server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
