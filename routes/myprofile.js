const express = require("express");
const route = express.Router();
const { getter, update, updload_image, unnes_image, birthday_image } = require('../controller/myprofile')
const { authorization } = require('../middleware')
route.post("/image", authorization(),updload_image)
route.get("/unnes", authorization(),unnes_image)
route.get('/birthday', authorization(), birthday_image)
route.get("/", authorization(), getter)
route.put("/",authorization(),  update)
module.exports = route;
