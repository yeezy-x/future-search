import {WebSocketServer} from "ws"
import http from "http"
import { handleConnection } from "./connectionManager";

export const initServer=(
    server:http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>
)=>{
    const port=process.env.PORT || 3000;
     //create a webSocket server and attach to exisitng http server
    const wss=new WebSocketServer({server})
    wss.on("connection",(ws)=>{
        handleConnection(ws)
    })
    console.log(`WebSocket server is running on port ${port}`);
}

//ws:WebSocket - represents my open communication channel with one fe client
//ws.send() - send data to the client
//ws.on("message",(message)=>{}) - receive data from the client
//ws.on("close",()=>{}) - handle client disconnection
//ws.on("error",(error)=>{}) - handle errors
//ws.on("ping",()=>{}) - handle ping messages
//ws.on("pong",()=>{}) - handle pong messages
//ws.on("close",()=>{}) - handle client disconnection
//ws.on("error",(error)=>{}) - handle errors
//ws.on("ping",()=>{}) - handle ping messages
//ws.on("pong",()=>{}) - handle pong messages
//ws.on("close",()=>{}) - handle client disconnection
//ws.on("error",(error)=>{}) - handle errors
