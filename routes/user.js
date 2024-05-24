const express = require("express");
const route = express.Router();
const { getter_all, getter, deleteUser, insert, update, updload_image } = require('../controller/user')
const { login } = require('../controller/authuser')
const { authorization } = require('../middleware')
route.delete("/:uuid",authorization('user_delete'), deleteUser)
route.get("/", authorization('user_get_multi'),getter_all)
route.post("/image", authorization('user_create'),updload_image)
route.get("/:uuid", authorization('user_get'), getter)
route.put("/:uuid",authorization('user_update'),  update)
route.post("/login",login)
route.post("/", authorization('user_create'), insert)
module.exports = route;