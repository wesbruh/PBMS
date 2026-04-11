import express from "express";
import { uploadGallery } from "../controllers/galleryController.js";

export default function galleryRoutes() {
    const router = express.Router();

    router.patch("/:galleryId/upload", uploadGallery);

    return router;
}