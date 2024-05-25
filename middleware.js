const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt');
const prisma = new PrismaClient
// get config vars
dotenv.config();
const checkPermission = async (user, text) =>{
  return await prisma.user.findFirst({
    where: {
      uuid: user["uuid"],
      OR: [{
        permissionUser: {
          some: {
            permission: {
              is: {
                guardName: text
              }
            }
          }
        }
      },
      {
        roleuser: {
          some: {
            role: {
              is: {
                permisionrole: {
                  some: {
                    permission: {
                      is: {
                        guardName: text
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        roleuser: {
          some: {
            role: {
              is: {
                guardName: 'super_admin'
              }
            }
          }
        }
      }
      ]
    },
    include: {
      permissionUser: {
        include: {
          permission: true
        }
      },
      roleuser: {
        include: {
          role: {
            include: {
              permisionrole: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      }
    }
  })
}
exports.authorization = (text = '', child_permission = []) => {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]
    if ((token == null) || (authHeader.split(' ')[0] != 'Bearer')) return res.status(401).json({ msg: "Akses tidak sah", code: 401 })
    jwt.verify(token, process.env.SECRET_TOKEN, async (err, user) => {
      if (err) return res.status(403).json({ msg: "Dilarang", code: 403 })
      req.user = user
      if (text != '') {
        let thare_premission = await checkPermission(user, text)
        if (!thare_premission){ 
          permission_name = await prisma.permission.findUnique({where:{guardName: text}, select:{name: true}})
          return await res.status(403).json({ msg: `Anda tidak memiliki izin untuk melakukan '${ permission_name.name ?? text }'`, code: 401 }) }
        if (child_permission.length){
          for (const permission_i of child_permission) {
            let thare_child_premission = await checkPermission(user, permission_i)
            if(thare_child_premission){
              req[permission_i] = true
            }
          }
        }
      }
      next()
    })
  }
}

exports.deviceAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]
  if ((token == null) || (authHeader.split(' ')[0] != 'Bearer')) return res.status(401).json({ msg: "Perangkat presensi tidak sah", code: 401 })
  jwt.verify(token, process.env.SECRET_DEVICE_TOKEN, async (err, device) => {
    if (err) return res.status(403).json({ msg: "Dilarang", code: 403, 'reson': 'device' })
    identity = device.identityKey
    uuid = device.uuid
    result = await prisma.device.findUnique({
      where: {
        uuid: uuid
      }
    })
    if (!result) return res.status(403).json({ msg: "Perangkat Tidak Cocok", code: 403, 'reson': 'device' })
    vacryResult = await bcrypt.compare(identity, result.identity)
    if (!vacryResult) return res.status(403).json({ msg: "Izin Perangkat Telah Dicabut", code: 403, 'reson': 'device' })
    req.device = result
    next()
  })
}