const express = require("express");
const route = express.Router();
const { getter, getter_all, insert, deleter, update, getDeviceLog } = require('../controller/group')
const { authorization } = require('../middleware')
route.get("/log/:uuid")
route.get("/:uuid", authorization('group_get'), getter)
route.get("/", authorization('group_get_multi', ['get_all_group']), getter_all)
route.post("/", authorization('group_create'), insert)
route.delete('/:uuid', authorization('group_delete'), deleter)
route.put('/:uuid', authorization('group_update'), update)
module.exports = route;