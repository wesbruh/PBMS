import express from "express";
import { uploadGallery } from "../controllers/galleryController.js";

 const router = express.Router();

 router.patch("/:galleryId/upload", uploadGallery);

 export default router;