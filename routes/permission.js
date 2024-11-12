const express = require("express");
const route = express.Router();
const { getter, getter_all, insert, deleter, update } = require('../controller/permission')
const { authorization } = require('../middleware')
route.get("/:uuid", authorization('permission_get'), getter)
route.get("/", authorization('permission_get_multi'), getter_all)
route.post("/", authorization('permission_create'), insert)
route.delete('/:uuid', authorization('permission_delete'), deleter)
route.put('/:uuid', authorization('permission_update'), update)
module.exports = route;