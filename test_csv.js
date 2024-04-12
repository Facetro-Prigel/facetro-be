

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

const utils = require("./helper/utils")
const axios = require("axios")
const ml_url = "http://localhost:5039/"
// utils.fileToBase64("./inital_photos/5312421026.jpg").then((s)=>{
//     console.log(s)
// })
const getFaceSignature = async (file) =>{
    let bbox = []
    let base64 = ""
    let signiture = "" 
    let data  = ""
    await utils.fileToBase64(file).then((y)=>{
        data= {image:y}
        base64=y
    }).catch((error)=>{
        console.log(error)
    })
    await axios.post(`${ml_url}build`,data).then((res)=>{
        let datas = res.data
        bbox= datas.bbox
        signiture = datas.signatureData
    })
    console.log(signiture)
    return [bbox, signiture, base64]
}
getFaceSignature("inital_photos/4612421017.jpg")
