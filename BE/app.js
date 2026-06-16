import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { scopePerRequest } from 'awilix-express'
import { configDotenv } from 'dotenv'
import container from './container.js'
import { handleError } from './src/api/middleware/middleware.js'
import { setupSwagger } from './src/config/swagger.js'
configDotenv();

const app = express();

// // FRONTEND_URL can be a comma-separated list, e.g.
// // "https://fe-beryl-sigma.vercel.app,http://localhost:8080"
// const allowedOrigins = (process.env.FRONTEND_URL || "")
//     .split(",")
//     .map((origin) => origin.trim())
//     .filter(Boolean);

app.use(cors({
    origin: process.env.FRONTEND_URL,
    // origin(origin, callback) {
    //     // Allow non-browser clients (curl, mobile, server-to-server) which send no Origin,
    //     // and any origin in the allow-list. Reflecting the exact origin is required because
    //     // credentials (cookies) cannot be used with a wildcard "*".
    //     if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
    //         return callback(null, true);
    //     }
    //     // Disallowed origin: don't set CORS headers, but don't throw either so the
    //     // request can still be served (the browser is what enforces the block).
    //     return callback(null, false);
    // },
    credentials: true, //cho phép call cross-site
}));

app.use(cookieParser())

app.use(express.json());
app.use(express.urlencoded());
app.use(scopePerRequest(container))

setupSwagger(app);

//import routes
import AuthRouter from './src/api/routers/auth.router.js'
import ParkingRouter from './src/api/routers/parking.router.js'
import ReservationRouter from './src/api/routers/reservation.router.js'
import UserRouter from './src/api/routers/user.router.js'
import VehicleRouter from './src/api/routers/vehicle.router.js'

app.get("/", (req, res) => {
    res.send(`ZAWARUDO!`)
})

const url = "/api/v1"

//user routers
app.use(`${url}/auth`, AuthRouter)
app.use(`${url}/parking`, ParkingRouter)
app.use(`${url}/reservations`, ReservationRouter)
app.use(`${url}/users`, UserRouter)
app.use(`${url}/vehicles`, VehicleRouter)

//handle error
app.use(handleError)

export default app