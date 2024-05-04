const express = require("express");
const route = express.Router();
const device = require('./device')
const log = require('./log')
const user = require('./user')
const middleware = require('../middleware')
route.use('/device',device)
route.use('/log', middleware.deviceAuth, log)
route.use('/user',user)
module.exports = route;