const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const utils = require('../../helper/utils');
const axios = require('axios');
const ml_url = process.env.ML_URL
const prisma = new PrismaClient
const generator = require('../../helper/generator')
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const getFaceSignature = async (file) =>{
    let bbox = []
    let base64 = ""
    let signiture = "" 
    let data  = ""
    let config_u = {
        headers: {
          "Content-Type": "application/json",
        }
      }
    await utils.fileToBase64(file).then((y)=>{
        data= {image:y}
        base64=y
    }).catch((error)=>{
        console.error(`Convert Error in ${file}`)
    })
    await axios.post(`${ml_url}build`,data, config_u).then((res)=>{
        let datas = res.data
        bbox= datas.bbox
        signiture = datas.signatureData
    }).catch((e)=>{
        console.error(`Request Error in ${file}`)
    })
    return [bbox, signiture, base64]
}
exports.run = async () => {
    const users = await prisma.user.findMany()
    for (let user of users) {
        let hu = await getFaceSignature(`./inital_photos/${user.identity_number}.jpg`)
        let newName = generator.generateString(20)+".jpg"
        utils.copyAndRenameImage(`./inital_photos/${user.identity_number}.jpg`, "./photos", newName)
        await prisma.user.update({where:{
            uuid:user.uuid
        }, data:{
            signature:hu[1],
            bbox:hu[0],
            avatar: "photos/"+newName
        }})
    }
}