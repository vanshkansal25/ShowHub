import {Server} from "socket.io"

let io:Server;

export const initSocket = (server:any)=>{
    io = new Server(server)
    io.on("connection",(socket)=>{
        console.log("User Connected", socket.id)
        // make them join show room
        socket.on("join_show",(showId:string)=>{
            socket.join(showId);
            console.log(`Socket ${socket.id} joined show ${showId}`)
        })
        socket.on("disconnect",()=>{
            console.log("User disconnected:", socket.id);
        })
    })
    return io;
}

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized");
    }
    return io;
};