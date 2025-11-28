const express = require("express");
const router = express.Router();
const { publishGallery } = require("../controllers/galleryController");

router.post("/galleries/:id/publish", publishGallery);

module.exports = router;