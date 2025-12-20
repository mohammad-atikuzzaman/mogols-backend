const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    const dbName = process.env.MONGO_DB_NAME;

    if (!uri) {
      throw new Error("MONGO_URI is not defined");
    }

    if (mongoose.connection.readyState >= 1) {
      return;
    }

    const conn = await mongoose.connect(uri, {
      dbName,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    // process.exit(1); // Removed for serverless
    throw error;
  }
};

module.exports = connectDB;
