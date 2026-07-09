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

// FRONTEND_URL can be a comma-separated list, e.g.
// "https://fe-beryl-sigma.vercel.app,http://localhost:8080"
const allowedOrigins = (process.env.FRONTEND_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        // Non-browser clients (curl, mobile) send no Origin header.
        if (!origin) {
            return callback(null, true);
        }
        if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    credentials: true, // cho phép call cross-site với cookie
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
import PaymentRouter from './src/api/routers/payment.router.js'
import ChatbotRouter from './src/api/routers/chatbot.router.js'
import PricePolicyRouter from './src/api/routers/pricePolicy.router.js'
import FloorRouter from './src/api/routers/floor.router.js'
import ParkingSlotRouter from './src/api/routers/parkingSlot.router.js'
import ParkingSessionRouter from './src/api/routers/parkingSession.router.js'
import DashboardRouter from './src/api/routers/dashboard.router.js'

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
app.use(`${url}/payment`, PaymentRouter)
app.use(`${url}/price-policies`, PricePolicyRouter)
app.use(`${url}/floors`, FloorRouter)
app.use(`${url}/parking-slots`, ParkingSlotRouter)
app.use(`${url}/parking-sessions`, ParkingSessionRouter)
app.use(`${url}/dashboard`, DashboardRouter)
app.use(`${url}/chatbot`, ChatbotRouter)

//handle error
app.use(handleError)

export default app