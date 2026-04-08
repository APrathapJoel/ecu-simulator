import mongoose from "mongoose";

let isConnected = false;

export const connectToDatabase = async () => {
  if (isConnected) {
    return;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn("MONGODB_URI not set - running in offline/in-memory mode.");
    console.warn("Set MONGODB_URI environment variable for persistent storage.");
    return;
  }

  try {
    console.log("Attempting to connect to MongoDB...");
    const db = await mongoose.connect(uri);
    isConnected = db.connection.readyState === 1;
    console.log("Successfully connected to MongoDB Atlas");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    console.error("Falling back to in-memory storage - data will not persist!");
    // Do NOT exit — server stays alive and uses in-memory fallback
  }
};

export const isDatabaseConnected = () => mongoose.connection.readyState === 1;

export * from "./schema/ecuReadings";
export * from "./schema/dtcs";
export * from "./schema/users";
