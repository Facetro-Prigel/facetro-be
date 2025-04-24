const express = require("express");
const route = express.Router();
const { getter_all, getter, deleteUser, insert, update, upload_image, unnes_image, birthday_image, getUserPresenceLog } = require('../controller/user')
const { login } = require('../controller/authuser')
const { authorization } = require('../middleware')
route.delete("/:uuid",authorization('user_delete'), deleteUser)
route.get("/", authorization('user_get_multi', ['show_all_users']),getter_all)
route.get('/birthday/:uuid', authorization('user_get'), birthday_image)
route.post("/image", authorization(),upload_image)
route.post("/unnes", authorization(),unnes_image)
route.get("/:uuid", authorization('user_get'), getter)
route.put("/:uuid",authorization('user_update', ['asign_user_to_group', 'asign_user_to_permision', 'asign_user_to_role']),  update)
route.post("/login",login)
route.post("/", authorization('user_create', ['asign_user_to_group', 'asign_user_to_permision', 'asign_user_to_role']), insert)
route.get("/presence/:uuid", authorization('user_get'), getUserPresenceLog)
module.exports = route;