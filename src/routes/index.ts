import express from "express";
import imagesRouter from "./images";
import webSearchRouter from "./webSearch";
const router=express.Router();

router.use("/images",imagesRouter);
router.use("/web",webSearchRouter);

export default router