import express from 'express';
import http from "http"
import dotenv from 'dotenv';
import { CorsOptions } from 'cors';
import cors from 'cors';
import router from './routes';
import { startWebSocketServer } from './websocket';
import { WebSocketServer } from 'ws';

dotenv.config();

const app=express();
//create an http server
const server=http.createServer(app);

//create a webSocket server and attach to existing http server
const wss=new WebSocketServer({server});

const corsOptions:CorsOptions={ //cors options for the server
    origin:"*"
};

app.use(cors(corsOptions));
app.use(express.json());

app.use("/api",router);
app.get('/api',(_,res)=>{
    res.status(200).json({status:'ok'});
});

startWebSocketServer(wss);

server.listen(3000, () => {
    console.log("HTTP + WebSocket server running on port 3000");
});



