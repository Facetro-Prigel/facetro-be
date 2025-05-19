const express = require("express");
const route = express.Router();
const { log, getLog, recognition, afterRecog, editLog, recognitionRecovery, deleteLog} = require('../controller/log')
const { getFullRecap, getQuickRecap } = require("../controller/recap");
const middleware = require('../middleware')
route.post("/", middleware.deviceAuth(), log)
route.get("/", middleware.authorization('', ['show_other_log']), getLog)
route.put("/:uuid", middleware.authorization('edit_log'), editLog)
route.delete("/:uuid", middleware.authorization('delete_log'), deleteLog)
route.get("/full_recap", middleware.authorization("", ["show_other_log"]), getFullRecap);
route.get("/quick_recap", middleware.authorization("", ["show_other_log"]), getQuickRecap);
route.post("/reco/after", middleware.deviceAuth(), afterRecog)
route.post("/reco", middleware.deviceAuth(), recognition)
route.put("/reco", middleware.deviceAuth(), recognitionRecovery)
module.exports = route;