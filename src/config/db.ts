import "dotenv/config";
import mongoose from "mongoose";


const DB_URI = process.env.DB_URI || "mongodb://localhost:27017/showhub";

const connectDB = async () =>{
    try {
        const connectionInstance = await mongoose.connect(DB_URI);
        console.log("Connected to DB successfully",connectionInstance.connection.host);
    } catch (error) {
        console.log("Error connecting to DB",error);
        process.exit(1);
    }
}

export default connectDB;