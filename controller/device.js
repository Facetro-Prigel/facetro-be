const { PrismaClient } = require('@prisma/client')
const generator = require('../helper/generator')
const prisma = new PrismaClient()
const utils = require('../helper/utils')
require('dotenv').config();
const checkDeleteUpdate = async (uuid, reqs) => {
  const user = await prisma.device.findUnique({
    where: {
      uuid: uuid
    },
    select: {
      name: true,
    }
  });
  return user
}
module.exports = {
  register: async (req, res) => {
    let results, token;
    if (!req.body.token) {
      return utils.createResponse(res, 400, "Bad Request", "Mohon masukkan token!", "/device/register");
    }
    try {
       results = await prisma.device.findUnique({
        where: {
          token: req.body.token,
        }
      })
      if (!results) { 
        return utils.createResponse(res, 404, "Not Found", "Token tidak ditemukan!", "/device/register") 
      }
      let identityKey = generator.generateString(10)
       token = generator.generateAccessToken({ uuid: results.uuid, identityKey: identityKey }, process.env.SECRET_DEVICE_TOKEN)
      await prisma.device.update({
        where: {
          token: req.body.token,
        },
        data: {
          token: generator.generateString(8),
          identity: await generator.generatePassword(identityKey, 10),
          ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress
        }
      })
    } catch (error) {
      console.error("Error while inserting device:", error);
      return utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", "/device/register"); 
    }
    return utils.createResponse(res, 200, "Success", "Token berhasil diaktifkan!", "/device/register", { 'token': token, 'name': results.name, 'uuid': results.uuid });
    // return utils.createResponse(res, 200, "Success", "Token berhasil diaktifkan!", "/device/register", { 'access_token': token, 'refresh_token': token, 'name': results.name, 'uuid': results.uuid, 'nfc_list': [ntar dulu]}); 
  },
  getter_all: async (req, res) => {
    let isExist;
    try {
      isExist = await prisma.device.findMany({
        select: {
          uuid: true,
          name: true,
          locations: true,
          ip_address: true,
          token: true
        },
      });
    } catch (error) {
      console.error("Error while inserting device:", error);
      return utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", "/device");
    }
    return utils.createResponse(res, 200, "Success", "Device berhasil ditemukan", "/device", {data: isExist});
  },
  getter: async (req, res) => {
    var uuid = req.params.uuid;
    let isExist;
    try {
      isExist = await prisma.device.findUnique({
        where: { uuid: uuid },
        select: {
          name: true,
          locations: true,
          token: true,
          groups: {
            select:{
              uuid: true,
              name: true
            }
          }
        },
      });
    } catch (error) {
      console.error("Error while inserting device:", error);
      return utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/device/${uuid}`);
    }

    return utils.createResponse(res, 200, "Success", "Device berhasil ditemukan", `/device/${uuid}`, {data: isExist});
  },

  insert: async (req, res) => {
    try {
      let token = req.body.token ?? generator.generateString(6)
      let data = {
        name: req.body.name,
        locations: req.body.location,
        token: token
      }
      let identityKey = generator.generateString(10)
      data.identity = await generator.generatePassword(identityKey, 10)
      let result = await prisma.device.create({
        data: data
      })
    } catch (error) {
      console.error("Error while inserting device:", error);
      return utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", "/device");
    }
    utils.webSockerUpdate(req)
    return utils.createResponse(res, 200, "Success", "Perangkat berhasil ditambahkan", "/device");
  },
  deleter: async (req, res) => {
    let uuid = req.params.uuid
    let check = await checkDeleteUpdate(uuid)

    if (!check) {
      return utils.createResponse(res, 404, "Not Found", "Device tidak ditemukan", `/device/${uuid}`);
    }
    try {
      await prisma.device.delete({ where: { uuid: uuid } })
    } catch (error) {
      console.error("Error while inserting device:", error);
      return utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/device/${uuid}`);
    }
    utils.webSockerUpdate(req)
    return utils.createResponse(res, 200, "Success", "Perangkat berhasil dihapus", `/device/${uuid}`);
  },
  update: async (req, res) => {
    let uuid = req.params.uuid
    let check = await checkDeleteUpdate(uuid)
    
    if (!check) {
      return utils.createResponse(res, 404, "Not Found", "Device tidak ditemukan", `/device/${uuid}`); 
    }
    try {
      let data = {
        name: req.body.name,
        locations: req.body.location,
      }
      if (req.body.token) {
        data.token = req.body.token
      }
      let result = await prisma.device.update({
        where: {
          uuid: uuid
        },
        data: data
      })
    } catch (error) {
      console.error("Error while inserting device:", error);
      return utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/device/${uuid}`);
    }
    utils.webSockerUpdate(req)
    return utils.createResponse(res, 200, "Success", "Perangkat berhasil diupdate", `/device/${uuid}`);
  },
  nfc_get: async (req, res) => {
    let uuid = req.device.uuid;
    let nfcs = await prisma.device.findUnique({
          where: { uuid: deviceUuid },
          include: {
              group: {
                  include: {
                      usergroup: {
                          include: {
                              user: {
                                  include: {
                                      nfc_data: true
                                  }
                              }
                          }
                      }
                  }
              }
          }
      });
      console.log(JSON.stringify(nfcs));
      utils.createResponse(res, 200, "Success", "Perangkat berhasil diupdate", `/device/${uuid}`, nfcs);
      //aku mau implement get nfc dari semua user yang terkait pada device tertentu
      // jika di sql aku mengakses user ke device adalah sebagai berikut
      // select u.uuid, ug.uuid, g.uuid, d.uuid from User u join UserGroup ug on u.uuid = ug.uuid join Group g on g.uuid = ug.uuid join Device d on d.uuid = g.devices
    
    if (!check) {
      return utils.createResponse(res, 404, "Not Found", "Device tidak ditemukan", `/device/${uuid}`); 
    }
    return utils.createResponse(res, 200, "Success", "Perangkat berhasil diupdate", `/device/${uuid}`);
  },
  nfc_status: async (req, res) => {
      let uuid = req.params.uuid
      let nfc_data = await prisma.device.findUnique({
        where: { uuid: deviceUuid },
        include: {
            group: {
                include: {
                    usergroup: {
                        include: {
                            user: true
                        },
                        orderBy: {
                            user: {
                                modified_at: 'desc'
                            }
                        },
                        take: 1
                    }
                }
            }
        }
    });
    
    let latestModifiedAt = nfc_data?.group?.usergroup[0]?.user?.modified_at || null;
    console.log(latestModifiedAt);
    
    if (!nfc_data) {
      return utils.createResponse(res, 404, "Not Found", "Device tidak ditemukan", `/device/${uuid}`); 
    }
    return utils.createResponse(res, 200, "Success", "Perangkat berhasil diupdate", `/device/${uuid}`, nfc_data);
  },
};
