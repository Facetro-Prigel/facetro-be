const nodemailer = require("nodemailer");
const fs = require('fs');

const readHTMLFile = (path, callback) => {
  fs.readFile(path, {encoding: 'utf-8'}, function (err, html) {
      if (err) {
         callback(err);                 
      }
      else {
          callback(null, html);
      }
  });
};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: "smtp.gmail.email",
  port: 587,
  secure: false, // Use `true` for port 465, `false` for all other ports
  auth: {
    user: "facetro.unnes@gmail.com",
    pass: "ptib wbub vmlx taoh",
  },
});
module.exports = {
sendMail:(data)=>{
    readHTMLFile('./index.html', async function(err, html) {
      if (err) {
         console.log('error reading file', err);
         return;
      }
      //Name
      html = html.replace("uSAJSserne", data.name)
      html = html.replace("emailSEE212", data.email)
      html = html.replace("p43232sas", data.password)
      html = html.replace("t0ket3l", data.token)
      html = html.replace("husashb", data.bimbingan)
      const info = await transporter.sendMail({
        from: '"no-replay FACETRO" <facetro.unnes@gmail.com>', // sender address
        to: data.email, // list of receivers
        subject: "Informasi Akun", // Subject line
        text: "Email ini berisi infomasi rahasia untuk masuk ke sistem SIM dan Telegram", // plain text body
        html: html, // html body
      });
    
      console.log("Message sent: %s", info.messageId);
    });
}
}
