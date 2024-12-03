const express = require("express");
const route = express.Router();
const { handleGetLog, makeRecap } = require('../controller/recap')
const middleware = require('../middleware')
route.get("/:uuid", middleware.authorization(), handleGetLog)
route.post("/", middleware.authorization(), handleGetLog)
route.get("/download/:uuid", middleware.authorization(), makeRecap)
// route.post("/download/:uuid", middleware.authorization("get_others_recap"), makeRecap)
module.exports = route;