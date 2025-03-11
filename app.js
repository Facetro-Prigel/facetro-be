const express = require('express');
const bodyParser = require('body-parser');
const { PrismaClient } = require('@prisma/client')
const allRoutes = require("./routes");
const { Server } = require('socket.io');
const { execSync } = require('child_process')
const app = express();
const server = require('http').createServer(app);
var cors = require('cors');
const minioClient = require('./minioClient')
const utils = require('./helper/utils');

app.get('/avatar/:filename', async (req, res) => {
  const filename = req.params.filename;

  const link_404 = process.env.FRONTEND_URL + "/404"

  const referer = req.get('Referer');
  const origin = req.get('Origin');
  
  // Redirect ke halaman 404 jika tidak ada referer atau origin (permintaan langsung)
  // if (!referer && !origin) {
  //   return res.redirect(link_404);
  // }
  try {
    const responseStream = await minioClient.getObject('avatar', filename);
    res.set('Content-Type', 'image/jpeg');
    responseStream.pipe(res);
  } catch (e) {
    console.error('Error fetching image from minio: ', e);
    res.redirect(link_404);  // Redirect jika gambar tidak ditemukan
  }
});

app.get('/photos/:filename', async (req, res) => {
  const filename = req.params.filename;

  const link_404 = process.env.FRONTEND_URL + "/404"

  const referer = req.get('Referer');
  const origin = req.get('Origin');

  // Redirect ke halaman 404 jika tidak ada referer atau origin (permintaan langsung)
  if (!referer && !origin) {
    return res.redirect(link_404);
  }
  try {
    let responseStream = await minioClient.getObject('photos', filename);
    res.set('Content-Type', 'image/jpeg');
    responseStream.pipe(res);
  } catch (e) {
    try {
      let responseStream = await minioClient.getObject('log', filename);
      res.set('Content-Type', 'image/jpeg');
      responseStream.pipe(res);
    } catch (e) {
      console.error('Error fetching image from minio: ', e);
      res.redirect(link_404);  // Redirect jika gambar tidak ditemukan
    }
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
  console.info(`Pengguna (${socket.id}) terhubung ke websocket`);
  socket.on('disconnect', () => {
    console.info(`Pengguna (${socket.id}), terputus ke websocket`);
  });
});
io.on("connection_error", (err) => {
  console.error(err.req);      // the request object
  console.error(err.code);     // the error code, for example 1
  console.error(err.message);  // the error message, for example "Session ID unknown"
  console.error(err.context);  // some additional error context
});
BigInt.prototype.toJSON = function () {
  const int = Number.parseInt(this.toString());
  return int ?? this.toString();
};
console.info("=======Bejalan Menggunakan Versi=======")
let data_commit = execSync("git show --summary").toString().split(/\r?\n/)
let penulis = data_commit[1]
let waktu = data_commit[2]
let pesan = data_commit[4]

if (data_commit[1].indexOf("Merge:") != -1) {
  penulis = data_commit[2]
  waktu = data_commit[3]
  pesan = data_commit[5]
}
console.table({
  hash: data_commit[0].replace("commit ", ""),
  penulis: penulis.replace("Author: ", ""),
  waktu: new Date(waktu.replace("Date:", "").trim()).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    timeStyle: "long",
    dateStyle: "full"
  }),
  pesan: pesan.trim(),
})
// console.table(process.env)
app.get('/', (req, res) => {
  utils.createResponse(res, 200, 'success', 'Hello!')
});

server.listen(process.env.PORT, '0.0.0.0', () => {
  console.info(`Aplikasi berjalan di 0.0.0.0 di port ${process.env.PORT}`);
});

