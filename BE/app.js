import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { scopePerRequest } from 'awilix-express'
import { configDotenv } from 'dotenv'
import swaggerUi from 'swagger-ui-express'
import swaggerJSDoc from 'swagger-jsdoc'
import container from './container.js'
import { handleError } from './src/api/middleware/middleware.js'
configDotenv();

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
}));

app.use(cookieParser())

app.use(express.json());
app.use(express.urlencoded());
app.use(scopePerRequest(container))

// Swagger Configuration
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Parking Building Management System API',
            version: '1.0.0',
            description: 'API documentation for the backend system',
        },
        servers: [
            {
                url: `http://localhost:${process.env.PORT || 3000}`,
            },
        ],
    },
    apis: ['./src/api/routers/*.js'], // Quét comments trong các file router
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

//import routes
import AuthRouter from './src/api/routers/auth.router.js'

app.get("/", (req, res) => {
    res.send(`ZAWARUDO!`)
})

const url = "/api/v1"

//user routers
app.use(`${url}/auth`, AuthRouter)

//handle error
app.use(handleError)

export default app