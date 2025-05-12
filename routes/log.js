const express = require("express");
const route = express.Router();
const { log, getLog, recognition, afterRecog, recognitionRecovery} = require('../controller/log')
const { getRecap } = require("../controller/recap");
const middleware = require('../middleware')
route.post("/", middleware.deviceAuth(), log)
route.get("/", middleware.authorization('', ['show_other_log']), getLog)
route.get("/recap", middleware.authorization("", ["show_other_log"]), getRecap);
route.post("/reco/after", middleware.deviceAuth(), afterRecog)
route.post("/reco", middleware.deviceAuth(), recognition)
route.put("/reco", middleware.deviceAuth(), recognitionRecovery)
module.exports = route;