const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const {PrismaClient} = require('@prisma/client')
const bcrypt = require('bcrypt');
const prisma = new PrismaClient
// get config vars
dotenv.config();
exports.authorization = (text) =>{
    return (req, res, next) =>{
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1]
      if ((token == null) || (authHeader.split(' ')[0] != 'Bearer')) return res.status(401).json({msg:"Akses tidak sah", code:401})
      jwt.verify(token, process.env.SECRET_TOKEN, (err, user) => {
        if (err) return res.status(403).json({msg:"Dilarang", code:403})
        req.user = user
        next()
      })
    }
  }

exports.deviceAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]
  if ((token == null) || (authHeader.split(' ')[0] != 'Bearer')) return res.status(401).json({msg:"Perangkat presensi tidak sah", code:401})
  jwt.verify(token, process.env.SECRET_DEVICE_TOKEN, async (err, device) => {
    if (err) return res.status(403).json({msg:"Dilarang", code:403})
    identity = device.identityKey
    uuid = device.uuid
    result = await prisma.device.findUnique({
      where:{
        uuid:uuid
      }
    })
    if (!result) return res.status(403).json({msg:"Perangkat Tidak Cocok", code:403})
    vacryResult = await bcrypt.compare(identity, result.identity)
    if (!vacryResult) return res.status(403).json({msg:"Izin Perangkat Telah Dicabut", code:403})
    req.device = result
    next()
  })
}