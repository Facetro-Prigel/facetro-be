const express = require("express");
const route = express.Router();
const { log, getLog, cardlessRequest, cardlessVerify } = require('../controller/log')
const middleware = require('../middleware')
route.post("/", middleware.deviceAuth, log)
route.get("/log", middleware.authorization(), getLog("log"))
route.get("/door", middleware.authorization(), getLog("door"))
route.get("/cardless", middleware.authorization(),cardlessRequest)
route.post("/cardless", middleware.deviceAuth,  cardlessVerify)
module.exports = route;