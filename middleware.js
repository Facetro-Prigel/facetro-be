const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt');
const prisma = new PrismaClient
const { createResponse } = require('./helper/utils')
require('dotenv').config();

const checkPermission = async (user, text) => {
  return await prisma.user.findFirst({
    where: {
      uuid: user["uuid"],
      OR: [{
        permission_user: {
          some: {
            permission: {
              is: {
                guard_name: text
              }
            }
          }
        }
      },
      {
        role_user: {
          some: {
            role: {
              is: {
                permission_role: {
                  some: {
                    permission: {
                      is: {
                        guard_name: text
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
        role_user: {
          some: {
            role: {
              is: {
                guard_name: 'super_admin'
              }
            }
          }
        }
      }
      ]
    },
    include: {
      permission_user: {
        include: {
          permission: true
        }
      },
      role_user: {
        include: {
          role: {
            include: {
              permission_role: {
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
    if ((token == null) || (authHeader.split(' ')[0] != 'Bearer')) return createResponse(res, 401, "Unauthorized", "Akses Tidak Sah!", req.route)
    jwt.verify(token, process.env.SECRET_TOKEN, async (err, user) => {
      if (err) return createResponse(res, 403, "Forbidden", "Anda memberikan token Autentikasi yang salah", req.route)
      req.user = user
      if (text != '') {
        let thare_premission = await checkPermission(user, text)
        if (!thare_premission) {
          permission_name = await prisma.permission.findUnique({ where: { guard_name: text }, select: { name: true } })
          return createResponse(res, 403, "Forbidden", `Anda tidak memiliki izin untuk melakukan'${permission_name.name ?? text}'`, req.route)
        }
        if (child_permission.length) {
          for (const permission_i of child_permission) {
            let thare_child_premission = await checkPermission(user, permission_i)
            if (thare_child_premission) {
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
  const protoIdentifier = req.headers['x-device-identifier'];
  const token = authHeader && authHeader.split(' ')[1]
  if ((token == null) || (authHeader.split(' ')[0] != 'Bearer')) return createResponse(res, 401, "Perangkat presensi tidak sah", "Bentuk autentikasi perangkat presensi ini tidak memenuhi standar autentikasi sistem kami", req.route)
  jwt.verify(token, process.env.SECRET_DEVICE_TOKEN, async (err, device) => {
    if (err) return createResponse(res, 403, "Dilarang", "Perangkat ini memberikan token Autentikasi yang salah", req.route)
    identity = device.identityKey
    uuid = device.uuid
    result = await prisma.device.findUnique({
      where: {
        uuid: uuid
      }
    })
    if (!result) return createResponse(res, 403, "Perangkat Tidak Cocok", "Perangkat ini memberikan parameter yang berbeda dari yang telah kami buat sebelumnya", req.route)
    vacryResult = await bcrypt.compare(identity, result.identity)
    if (!vacryResult) return createResponse(res, 403, "Izin Dicabut!", "Izin untuk perangkat ini telah dicabut", req.route)
    req.device = result
    next()
  })
}