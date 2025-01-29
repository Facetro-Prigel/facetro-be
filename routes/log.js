const express = require("express");
const route = express.Router();
const { log, getLog, cardlessRequest, cardlessVerify } = require('../controller/log')
const middleware = require('../middleware')
route.post("/", middleware.deviceAuth, log)
route.get("/presence/device/:uuid", middleware.authorization(), getLog("log", "device"))
route.get("/presence/user/:uuid", middleware.authorization(), getLog("log", "user"))
route.get("/presence", middleware.authorization(), getLog("log"))
route.get("/door/device/:uuid", middleware.authorization(), getLog("door", "device"))
route.get("/door/user/:uuid", middleware.authorization(), getLog("door", "user"))
route.get("/door", middleware.authorization(), getLog("door"))
route.get("/cardless", middleware.authorization(),cardlessRequest)
route.post("/cardless", middleware.deviceAuth,  cardlessVerify)
module.exports = route;