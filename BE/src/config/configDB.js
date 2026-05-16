import { configDotenv } from "dotenv";
configDotenv();

const env = process.env.NODE_ENV || 'development';

const configDB = {
    development: {
        uri: process.env.DEV_MONGO_URI
    },
    test: {
        uri: process.env.TEST_MONGO_URI,
    },
    production: {
        uri: process.env.PROD_MONGO_URI,
    }
}

export default configDB[env]