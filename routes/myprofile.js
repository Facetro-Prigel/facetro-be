const express = require("express");
const route = express.Router();
const { getter, update, updload_image, unnes_image } = require('../controller/myprofile')
const { authorization } = require('../middleware')
route.post("/image", authorization(),updload_image)
route.post("/unnes", authorization(),unnes_image)
route.get("/", authorization('user_get'), getter)
// route.get("/:uuid", authorization('user_get'), getter)
// route.put("/:uuid",authorization('user_update'),  update)
module.exports = route;
