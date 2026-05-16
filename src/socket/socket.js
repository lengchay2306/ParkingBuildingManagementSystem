import { socketAuth } from "./socketAuth.js";
import { Server } from 'socket.io'

export const initializeSocket = (httpServer) => {
    //init socket
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL,
            credentials: true,
        }
    });

    //create namespace
    const notificationNamespace = io.of("/notifications");
    notificationNamespace.use(socketAuth);

    notificationNamespace.on("connect", (socket) => {
        //namespaces
    });

    return { io, notificationNamespace }
}