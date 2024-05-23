const express = require("express");
const route = express.Router();
const { getter_all, getter, deleteUser, insert, updateUser } = require('../controller/user')
const { login } = require('../controller/authuser')
const { authorization } = require('../middleware')
route.delete("/:uuid",authorization('user_delete'), deleteUser)
route.get("/", authorization('user_get_multi'),getter_all)
route.get("/:uuid", authorization('user_get'), getter)
route.put("/:uuid",authorization('user_update'),  updateUser)
route.post("/login",login)
route.post("/", insert)
module.exports = route;