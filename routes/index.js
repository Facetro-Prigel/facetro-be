const express = require("express");
const route = express.Router();
const device = require('./device')
const log = require('./log')
const user = require('./user')
const middleware = require('../middleware')
const group = require('./group')
route.use('/device',device)
route.use('/log', middleware.deviceAuth, log)
route.use('/user',user)
route.use('/group',group)
module.exports = route;