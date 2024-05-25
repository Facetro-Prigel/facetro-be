const express = require("express");
const route = express.Router();
const device = require('./device')
const log = require('./log')
const user = require('./user')
const middleware = require('../middleware')
const group = require('./group')
const permission = require('./permission')
const role = require('./role')
route.use('/device',device)
route.use('/log', middleware.deviceAuth, log)
route.use('/user',user)
route.use('/group',group)
route.use('/permission',permission)
route.use('/role',role)
module.exports = route;