const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/sessionsController");

router.get("/types", ctrl.listSessionTypes);
router.get("/", ctrl.listUserSessions);          // ?clientId=...
router.get("/client", ctrl.listClientSessions);  // ?clientId=...
router.post("/batch", ctrl.batchBook);
router.post("/:id/cancel", ctrl.cancelSession);
router.post("/earliest", ctrl.earliestOnDate);   // helper for earliest feasible time

module.exports = router;
