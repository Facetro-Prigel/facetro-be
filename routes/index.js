const express = require("express");
const route = express.Router();
const device = require('./device')
const middleware = require('../middleware')
route.use('/device',device)
route.get('/loging', middleware.deviceAuth, (req, res) =>{
    res.status(210).json({"msg": "oke"})
})
module.exports = route;