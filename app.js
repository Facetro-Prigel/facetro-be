const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const bodyParser = require('body-parser');
const {PrismaClient} =require('@prisma/client')
const middleware = require('./middleware');
const allRoutes = require("./routes");
const telegram = require("./services/telegrambot");
var cors = require('cors');
const app = express();
const prisma= new PrismaClient(); 
// get config vars
app.use(cors())
app.use("/photos", express.static('photos'))
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(function(req, res, next) {
  res.status(404);

  // respond with html page
  if (req.accepts('html')) {
    res.render('404 Not Found! from: FACETRO!', { url: req.url });
    return;
  }

  // respond with json
  if (req.accepts('json')) {
    res.json({ error: 'Not found', code: 404, from: "FACETRO!" });
    return;
  }

  // default to plain-text. send()
  res.type('txt').send('Not found');
});
app.use(allRoutes);
telegram
// const hapus = async (req, res, model) =>{
//   const id = req.params.uuid
//   const call = eval('prisma.'+model)
//   const results = await call.delete({
//       where:{
//         uuid:id
//     }
//   });
//   res.send(results);
// }

// const tambah = async (req, res, model) =>{
//   const id = req.body
//   const call = eval('prisma.'+model)
//   const results = await call.create({
//     data:id
//   })
//   res.send(results);
// }

// const perbarui = async (req, res, model) => {
//   const id = req.params.uuid;
//   const post = req.body;
//   const call = eval('prisma.' + model);
//   const results = await call.update({
//     where: { uuid: id },
//     data: post
//   });
//   res.send(results);
// };

// const tampilkan = async (req, res, model) => {
//   const id = req.params.uuid;
//   const call = eval('prisma.' + model);
//   const results = await call.findUnique({
//     where: { uuid: id }
//   });
//   res.send(results);
// };

// const tampilkansemua = async (req, res, model) => {
//   const call = eval('prisma.' + model);
//   const results = await call.findMany();
//   res.send(results);
// };

// const method = ['user', 'role', 'permission', 'group', 'device'];
// method.forEach(element => {
//   app.delete(`/${element}/:uuid`, async (req, res) => {
//     hapus(req, res, element);
//   });
//   app.post(`/${element}`, async (req, res) => {
//     tambah(req, res, element);
//   });
//   app.put(`/${element}/:uuid`, async (req, res) => {
//     perbarui(req, res, element);
//   });
//   app.get(`/${element}/:uuid?`, async (req, res) => {
//     const id = req.params.uuid;
//     if (id) {
//       tampilkan(req, res, element);
//     } else {
//       tampilkansemua(req, res, element);
//     }
//   });
// });

app.get('/',(req, res) => {
  res.json({msg:'Hello!'});
});
app.listen(process.env.PORT, () => {
  console.log(`Aplikasi berjalan di port ${ process.env.PORT }`);
});