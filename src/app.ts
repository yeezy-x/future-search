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
//create an http server to handle http requests
const server=http.createServer(app);

//create a webSocket server and attach to the existing http server
const wss=new WebSocketServer({server});

const corsOptions:CorsOptions={ 
    //cors options for the server to allow requests from all origins
    origin:"*"
};

app.use(cors(corsOptions));
app.use(express.json());

app.use("/api",router);
app.get('/api',(_,res)=>{
    res.status(200).json({status:'ok'});
});

startWebSocketServer(wss);

const PORT=process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`HTTP + WebSocket server running on http://localhost:${PORT}`);
});



