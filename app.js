import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { scopePerRequest } from 'awilix-express'
import { configDotenv } from 'dotenv'
import container from './container.js'
import { handleError } from './src/api/middleware/middleware.js'
configDotenv();

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded());
app.use(scopePerRequest(container))

//import routes


app.get("/", (req, res) => {
    res.send(`ZAWARUDO!`)
})

const url = "/api/v1"

//user routers

//handle error
app.use(handleError)

export default app