const express = require("express");
const dotenv = require("dotenv").config();
const cors = require("cors");
const connectDB = require("./config/db");
const port = process.env.PORT || 7000;

connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/api/auth", require("./routes/authRoutes"));

app.get("/", (req, res) => {
  res.send("Mogols Backend is running!");
});

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
