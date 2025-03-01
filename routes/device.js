const express = require("express");
const route = express.Router();
const { register, getter, getter_all, insert, deleter, update, nfc_get, nfc_status } = require('../controller/device')
const { authorization } = require('../middleware')
route.post("/register", register)
route.get("/nfc/get", authorization(), nfc_get) 
route.get("/nfc/status", authorization(), nfc_status)
route.get("/:uuid", authorization('device_get'), getter)
route.get("/", authorization('device_get_multi'), getter_all)
route.post("/", authorization('device_create'), insert)
route.delete('/:uuid', authorization('device_delete'), deleter)
route.put('/:uuid', authorization('device_update'), update)
module.exports = route;