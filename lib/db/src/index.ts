import mongoose from "mongoose";

let isConnected = false;

export const connectToDatabase = async () => {
  if (isConnected) {
    return;
  }
  
  // Since you are on the Hotspot, standard cloud DNS SRV will now work flawlessly!
  // Atlas edge proxies require the SRV hostname for TLS SNI certification routing!
  const uri = process.env.MONGODB_URI || "mongodb+srv://aprathap24_db_user:Psalms%4023@clustervdashboard.e3uqdwn.mongodb.net/ecuSimulator?retryWrites=true&w=majority&appName=ClusterVDashboard";
  
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is required.");
  }

  try {
    const db = await mongoose.connect(uri);
    isConnected = db.connection.readyState === 1;
    console.log("Connected to MongoDB Atlas");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    // Do NOT exit — let the server stay alive so routes can return graceful errors
  }
};

export * from "./schema/ecuReadings";
export * from "./schema/dtcs";
export * from "./schema/users";
