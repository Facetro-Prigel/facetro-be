const express = require("express");
const route = express.Router();
const device = require('./device')
const log = require('./log')
const user = require('./user')
const myprofile = require('./myprofile')

const group = require('./group')
const permission = require('./permission')
const role = require('./role')
route.use('/device',device)
route.use('/log', log)
route.use('/user',user)
route.use('/group',group)
route.use('/permission',permission)
route.use('/role',role)
route.use('./myprofile',myprofile)
module.exports = route;
