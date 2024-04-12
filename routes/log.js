const express = require("express");
const route = express.Router();
const { log } = require('../controller/log')
route.post("/", log)
module.exports = route;