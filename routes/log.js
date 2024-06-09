const express = require("express");
const route = express.Router();
const { log, getLog } = require('../controller/log')
const middleware = require('../middleware')
route.post("/", middleware.deviceAuth, log)
route.get("/", middleware.authorization(), getLog)
module.exports = route;