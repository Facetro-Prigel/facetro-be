const express = require("express");
const route = express.Router();
const { log, getLog, recognation, afterRecog, editLog} = require('../controller/log')
const { getRecap } = require("../controller/recap");
const middleware = require('../middleware')
route.post("/", middleware.deviceAuth(), log)
route.get("/", middleware.authorization('', ['show_other_log']), getLog)
route.put("/", middleware.authorization('edit_log'), editLog)
route.get("/recap", middleware.authorization("", ["show_other_log"]), getRecap);
route.post("/reco/after", middleware.deviceAuth(), afterRecog)
route.post("/reco", middleware.deviceAuth(), recognation)
module.exports = route;