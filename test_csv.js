

// // Path file CSV
// const csvFilePath = 'nonprigel.csv';

// // Membaca file CSV dan melakukan sesuatu dengan data
// fs.createReadStream(csvFilePath)
//     .pipe(csv())
//     .on('data', (row) => {
//         // Lakukan sesuatu dengan data tiap baris (row)
//         console.log(row);
//     })
//     .on('end', () => {
//         console.log('Pembacaan file CSV selesai');
//     });

// const utils = require("./helper/utils")
// const axios = require("axios")
// const ml_url = "http://localhost:5039/"
// utils.fileToBase64("./inital_photos/5312421026.jpg").then((s)=>{
//     console.log(s)
// })
// const getFaceSignature = async (file) =>{
//     let bbox = []
//     let base64 = ""
//     let signiture = "" 
//     let data  = ""
//     await utils.fileToBase64(file).then((y)=>{
//         data= {image:y}
//         base64=y
//     }).catch((error)=>{
//         console.log(error)
//     })
//     await axios.post(`${ml_url}build`,data).then((res)=>{
//         let datas = res.data
//         bbox= datas.bbox
//         signiture = datas.signatureData
//     })
//     console.log(signiture)
//     return [bbox, signiture, base64]
// }
// getFaceSignature("inital_photos/4612421017.jpg")


import { createTransport } from "nodemailer";
import { readFile } from 'fs';

var readHTMLFile = function(path, callback) {
  readFile(path, {encoding: 'utf-8'}, function (err, html) {
      if (err) {
         callback(err);                 
      }
      else {
          callback(null, html);
      }
  });
};

const transporter = createTransport({
  service: 'gmail',
  host: "smtp.gmail.email",
  port: 587,
  secure: false, // Use `true` for port 465, `false` for all other ports
  auth: {
    user: "facetro.unnes@gmail.com",
    pass: "ptib wbub vmlx taoh",
  },
});

// readHTMLFile(__dirname + '/index.html', async function(err, html) {
//   if (err) {
//      console.log('error reading file', err);
//      return;
//   }

//   html = html.replace("uSAJSserne", "Yono")
//   const info = await transporter.sendMail({
//     from: '"no-replay FACETRO" <facetro.unnes@gmail.com>', // sender address
//     to: "muh.iqbalg1@gmail.com,xmod3905@students.unnes.ac.id", // list of receivers
//     subject: "Menguji Email", // Subject line
//     text: "Hello world?", // plain text body
//     html: html, // html body
//   });

//   console.log("Message sent: %s", info.messageId);
//   // Message sent: <d786aa62-4e0a-070a-47ed-0b0666549519@ethereal.email>
// });
// const hu = require('./helper/mailer')
// var sendMail=(data)=>{
//   readHTMLFile('./index.html', async function(err, html) {
//     if (err) {
//        console.log('error reading file', err);
//        return;
//     }
//     //Name
//     html = html.replace("uSAJSserne", data.name)
//     html = html.replace("emailSEE212", data.email)
//     html = html.replace("p43232sas", data.password)
//     html = html.replace("t0ket3l", data.token)
//     const info = await transporter.sendMail({
//       from: '"no-replay FACETRO" <facetro.unnes@gmail.com>', // sender address
//       to: data.email, // list of receivers
//       subject: "Informasi Akun", // Subject line
//       text: "Email ini berisi infomasi rahasia untuk masuk ke sistem SIM dan Telegram", // plain text body
//       html: html, // html body
//     });
  
//     console.log("Message sent: %s", info.messageId);
//   });
// }
// hu.sendMail({name:"Yono", email:"muh.iqbalg1@gmail.com", password:"yonomakan", token:"tokensuus"})


import TelegramBot from 'node-telegram-bot-api';

// replace the value below with the Telegram token you receive from @BotFather
const token = '6659659302:AAHaxS6PjY82SXncKhHKq-0KQasTiDZ9UnE';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});

// Matches "/echo [whatever]"
bot.onText(/\/echo (.+)/, (msg, match) => {
  // 'msg' is the received Message from Telegram
  // 'match' is the result of executing the regexp above on the text content
  // of the message

  const chatId = msg.chat.id;
  const resp = match[1]; // the captured "whatever"

  // send back the matched "whatever" to the chat
  bot.sendMessage(chatId, resp);
});

// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  // send a message to the chat acknowledging receipt of their message
  bot.sendMessage(chatId, 'Received your message');
});