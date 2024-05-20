const express = require("express");
const route = express.Router();
const { getter_all,getter, deleteUser } = require('../controller/user')
const { login, test } = require('../controller/authuser')
const { authorization } = require('../middleware')
route.delete("/:uuid",deleteUser)
route.get("/", authorization('user_get_multi'),getter_all)
route.get("/:uuid", authorization('user_get'), getter)
route.post("/login",login)
module.exports = route;