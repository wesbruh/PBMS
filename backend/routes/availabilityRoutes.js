const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/availabilityController");

router.get("/", ctrl.getWeeklyAvailability); // ?adminUserId=...
router.post("/", ctrl.upsertAvailability);   // { adminUserId, availability_rule:[{dow,start,end}] }

module.exports = router;
