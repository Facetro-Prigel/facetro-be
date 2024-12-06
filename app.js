const express = require('express');
const bodyParser = require('body-parser');
const {PrismaClient} =require('@prisma/client')
const middleware = require('./middleware');
const allRoutes = require("./routes");
const { Server } = require('socket.io');
const { execSync } = require('child_process')
const app = express();
const server = require('http').createServer(app);
var cors = require('cors');
const minioClient = require('./minioClient')
const prisma= new PrismaClient(); 

app.get('/photos/:filename', async (req, res) => {
    const filename = 'photos/' + req.params.filename;

    const limk_404 = process.env.FRONTEND_URL + "/404"

    const referer = req.get('Referer');
    const origin = req.get('Origin');

    // Redirect ke halaman 404 jika tidak ada referer atau origin (permintaan langsung)
    if (!referer && !origin) {
        return res.redirect(link_404);
    }

    try {
        const responseStream = await minioClient.getObject(process.env.MINIO_BUCKET_NAME, filename);
        res.set('Content-Type', 'image/jpeg');
        responseStream.pipe(res);
    } catch (e) {
        console.error('Error fetching image from minio: ', e);
        res.redirect(link_404);  // Redirect jika gambar tidak ditemukan
    }
});


// get config vars
app.use(cors())
//app.use("/photos", express.static('photos'))
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(allRoutes);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ["GET", "POST", "OPTIONS"]
  }
});
app.set('socketio', io);
io.on('connection', (socket) => {
  console.log(`Pengguna (${socket.id}) terhubung ke websocket`);
  socket.on('disconnect', () => {
    console.log(`Pengguna (${socket.id}), terputus ke websocket`);
  });
});
io.on("connection_error", (err) => {
  console.log(err.req);      // the request object
  console.log(err.code);     // the error code, for example 1
  console.log(err.message);  // the error message, for example "Session ID unknown"
  console.log(err.context);  // some additional error context
});
BigInt.prototype.toJSON = function () {
  const int = Number.parseInt(this.toString());
  return int ?? this.toString();
};

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
console.info("=======Bejalan Menggunakan Versi=======")
let data_commit = execSync("git show --summary").toString().split(/\r?\n/)
let penulis = data_commit[1]
let waktu = data_commit[2]
let pesan =  data_commit[4]
console.log(data_commit[1].indexOf("Merge:"))
if(data_commit[1].indexOf("Merge:") != -1){
  penulis = data_commit[2]
  waktu = data_commit[3]
  pesan =  data_commit[5]
}
console.table({
  hash: data_commit[0].replace("commit ", ""),
  penulis: penulis.replace("Author: ", ""), 
  waktu: new Date(waktu.replace("Date:", "").trim()).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    timeStyle: "long",
    dateStyle:"full"
  }), 
  pesan: pesan.trim(),
})
console.table(process.env)
app.get('/',(req, res) => {
  res.json({msg:'Hello!'});
});

server.listen(process.env.PORT,'0.0.0.0', () => {
  console.log(`Aplikasi berjalan di port ${ process.env.PORT }`);
});

