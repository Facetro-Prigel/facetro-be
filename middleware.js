const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client')
// get config vars
dotenv.config();
exports.authorization = (text) =>{
    return (req, res, next) =>{
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1]
      if (token == null) return res.status(401).json({msg:"Akses tidak sah", code:401})
      jwt.verify(token, process.env.SECRET_TOKEN, (err, user) => {
        console.log(err)
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
  jwt.verify(token, process.env.SECRET_TOKEN, (err, user) => {
    if (err) return res.status(403).json({msg:"Dilarang", code:403})
    console.log({"data":user})
    req.user = user
    next()
  })
}