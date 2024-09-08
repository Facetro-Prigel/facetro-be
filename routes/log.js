const express = require("express");
const route = express.Router();
const { log, getLog, cardlessRequest, cardlessVerify } = require('../controller/log')
const middleware = require('../middleware')
route.post("/", middleware.deviceAuth, log)
route.get("/", middleware.authorization(), getLog)
route.get("/cardless", middleware.authorization(),cardlessRequest)
route.post("/cardless", middleware.deviceAuth,  cardlessVerify)
module.exports = route;