

import express from "express";
import { verifyToken } from "../authmiddle/authUsers.js";
import {getUserSessions, getUserDocuments } from "../controller/dashboardController.js";

const router = express.Router();

router.get("/sessions", verifyToken, getUserSessions);
router.get("/documents", verifyToken, getUserDocuments);

export default router;