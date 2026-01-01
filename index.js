const express = require("express");
const dotenv = require("dotenv").config();
const cors = require("cors");
const connectDB = require("./config/db");
const port = process.env.PORT || 7000;

connectDB();

const app = express();

const cookieParser = require("cookie-parser");

app.use(cookieParser());
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// 1. Compression (Gzip)
app.use(compression());

// 2. Security Headers
app.use(helmet());

// 3. Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

// Apply rate limiting to all requests
app.use(limiter);

const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://mogols.vercel.app'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const { notFound, errorHandler } = require('./middleware/errorMiddleware');

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));

app.get("/", (req, res) => {
  res.send("Mogols Backend is running!");
});

app.use(notFound);
app.use(errorHandler);

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server started on port ${port}`);
  });
}

module.exports = app;
