import app from "./app.js";
import db from "./src/db/db.js"
import http from 'http';
import { initializeSocket } from "./src/socket/socket.js";
import { setupContainer } from "./container.js";
import { configDotenv } from "dotenv";
configDotenv();

const PORT = process.env.PORT || 3000

const server = http.createServer(app);

//init socket
const { io, notificationNamespace } = initializeSocket(server);

//setup container
setupContainer({ io, notificationNamespace });

//import model
import './src/models/Model.js'
//connect db
db().then(() => {
    console.log(`Connected to DB successfully!`);
    
    server.listen(PORT, () => {
        console.log(`Server is running on PORT: ${PORT}`);
        // console.log(`Swagger: http://localhost:3000/api-docs`);
    })
}).catch((err) => {
    console.log(`Error: ${err}`);
})