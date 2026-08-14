import express from 'express';
import http from "http"
import dotenv from 'dotenv';
import { CorsOptions } from 'cors';
import cors from 'cors';
import router from './routes';
dotenv.config();

const app=express();
const server=http.createServer(app);

const corsOptions:CorsOptions={
    origin:"*"
};
app.use(cors(corsOptions));
app.use(express.json());

app.use("/api",router);

app.get('/api',(_,res)=>{
    res.status(200).json({status:'ok'});
});

server.listen(process.env.PORT,()=>{
    console.log(`Server is running on port ${process.env.PORT}`);
});

