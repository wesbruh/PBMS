import express from "express";
import { uploadGallery } from "../controllers/galleryController.js";

export default function galleryRoutes(supabaseClient) {
    const router = express.Router();

    router.patch("/:galleryId/upload", uploadGallery(supabaseClient));

    return router;
}