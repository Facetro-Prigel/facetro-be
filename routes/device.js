const express = require("express");
const route = express.Router();
const { register } = require('../controller/device')
route.post("/register", register)
module.exports = route;