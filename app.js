const express = require('express');
const bodyParser = require('body-parser');
const allRoutes = require("./routes");
const { io: clientIO } = require("socket.io-client");
const { execSync } = require('child_process')
const app = express();
const server = require('http').createServer(app);
var cors = require('cors');
const mime = require('mime-types');
const minioClient = require('./minioClient')
const utils = require('./helper/utils');

const socket = clientIO((process.env.WEBSOCKET_URL || "http://localhost:3001"));

socket.on("connect", () => {
  console.info("Terhubung ke server WebSocket eksternal");
});

socket.on("connect_error", (error) => {
  console.error("Gagal terhubung ke server WebSocket:", error);
});

app.use(cors());

app.get('/avatar/:filename', async (req, res) => {
  const filename = req.params.filename;

  // Debugging: Log detail permintaan
  console.log('Request for avatar:', filename);
  console.log('Referer:', req.get('Referer'));
  console.log('Origin:', req.get('Origin'));

  // Cek referer atau origin untuk mencegah permintaan langsung
  const referer = req.get('Referer');
  const origin = req.get('Origin');
  if (!referer && !origin) {
      return res.status(403).send('Direct access forbidden'); // 403 Forbidden jika tidak ada referer/origin
  }

  try {
      // Ambil objek dari MinIO
      const responseStream = await minioClient.getObject('avatar', filename);

      // Deteksi tipe konten berdasarkan nama file
      const contentType = mime.contentType(filename) || 'application/octet-stream';
      res.set('Content-Type', contentType);

      // Kirim stream gambar sebagai respons
      responseStream.pipe(res);
  } catch (e) {
      // Tangani error berdasarkan jenis kesalahan
      console.error('Error fetching image from MinIO:', e);
      if (e.code === 'NoSuchKey') {
          return res.status(404).send('Image not found'); // 404 jika file tidak ditemukan
      } else {
          return res.status(500).send('Internal Server Error'); // 500 untuk kesalahan server lainnya
      }
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
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(allRoutes);
app.set('socketio', socket);
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

