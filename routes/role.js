const express = require("express");
const route = express.Router();
const { getter, getter_all, insert, deleter, update } = require('../controller/role')
const { authorization } = require('../middleware')
route.get("/:uuid", authorization('role_get'), getter)
route.get("/", authorization('role_get_multi'), getter_all)
route.post("/", authorization('role_create', ["asign_role_to_permision"]), insert)
route.delete('/:uuid', authorization('role_delete'), deleter)
route.put('/:uuid', authorization('role_update', ["asign_role_to_permision"]), update)
module.exports = route;