const express = require("express");
const route = express.Router();
const device = require('./device')
const log = require('./log')
const middleware = require('../middleware')
route.use('/device',device)
route.use('/log', middleware.deviceAuth, log)
module.exports = route;