import mongoose from "mongoose";

let isConnected = false;

export const connectToDatabase = async () => {
  if (isConnected) {
    return;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn("MONGODB_URI not set — running in offline/in-memory mode.");
    return;
  }

  try {
    const db = await mongoose.connect(uri);
    isConnected = db.connection.readyState === 1;
    console.log("Connected to MongoDB Atlas");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    // Do NOT exit — server stays alive and uses in-memory fallback
  }
};

export const isDatabaseConnected = () => mongoose.connection.readyState === 1;

export * from "./schema/ecuReadings";
export * from "./schema/dtcs";
export * from "./schema/users";
