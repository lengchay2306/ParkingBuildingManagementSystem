import mongoose from "mongoose";
import configDB from "../config/configDB.js";
import { configDotenv } from "dotenv";
configDotenv()
const connectDB = async () => {
    try {
        await mongoose.connect(configDB.uri);
        console.log(`Connecting to DB ${process.env.NODE_ENV} environment!`);
    } catch (error) {
        console.error(`Cannot connect to db server ${error}`);
        process.exit(1)
    }
}

export default connectDB