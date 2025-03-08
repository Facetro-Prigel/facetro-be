const express = require("express");
const route = express.Router();
const { log, getLog, recognation, afterRecog} = require('../controller/log')
const middleware = require('../middleware')
route.post("/", middleware.deviceAuth(), log)
route.get("/", middleware.authorization(), getLog)
route.post("/reco/after", middleware.deviceAuth(), afterRecog)
route.post("/reco", middleware.deviceAuth(), recognation)
module.exports = route;