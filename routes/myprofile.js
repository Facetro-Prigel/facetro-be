const express = require("express");
const route = express.Router();
const { getter, update, upload_image, unnes_image, birthday_image, dashboard } = require('../controller/myprofile')
const { change_password } = require('../controller/authuser')
const { authorization } = require('../middleware')
route.post("/image", authorization(),upload_image)
route.get("/unnes", authorization(),unnes_image)
route.get('/birthday', authorization(), birthday_image)
route.post("/change_password", authorization(), change_password)
route.get("/", authorization(), getter)
route.put("/",authorization(),  update)
route.get("/dashboard", authorization(), dashboard)
module.exports = route;
