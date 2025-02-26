const { PrismaClient } = require('@prisma/client')
const generator = require('../helper/generator')
const prisma = new PrismaClient()
const utils = require('../helper/utils');
const { UNABLE_TO_FIND_POSTINSTALL_TRIGGER_JSON_PARSE_ERROR } = require('@prisma/client/scripts/postinstall.js');
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
    let token = req.body.token;
    let results;
    if (!token) {
      return utils.createResponse(400, "Bad Request", "Mohon masukkan token!", "/device/register");
    }
    try {
      results = await prisma.device.findUnique({
        where: {
          token: req.body.token,
        }
      })

      if (!results) { 
        return utils.createResponse(404, "Not Found", "Token tidak ditemukan!", "/device/register") 
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
      return utils.createResponse(500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", "/device/register"); 
    }
    
    // return utils.createResponse(200, "Success", "Token berhasil diaktifkan!", "/device/register", { 'access_token': token, 'refresh_token': token, 'name': results.name, 'uuid': results.uuid, 'nfc_list': [ntar dulu]}); 
  },
  getter_all: async (req, res) => {
    let is_exist;
    try {
      is_exist = await prisma.device.findMany({
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
      return utils.createResponse(500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", "/device");
    }

    return utils.createResponse(200, "Success", "Device berhasil ditemukan", "/device", {data: is_exist});
  },
  getter: async (req, res) => {
    let is_exist;
    var uuid = req.params.uuid;
    try {
      is_exist = await prisma.device.findUnique({
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
      return utils.createResponse(500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/device/${uuid}`);
    }

    return utils.createResponse(200, "Success", "Device berhasil ditemukan", `/device/${uuid}`, {data: is_exist});
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
      return utils.createResponse(500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", "/device");
    }
    utils.webSockerUpdate(req)
    return utils.createResponse(200, "Success", "Perangkat berhasil ditambahkan", "/device");
  },
  deleter: async (req, res) => {
    let uuid = req.params.uuid
    try {
      let check = await checkDeleteUpdate(uuid)

      if (!check) {
        return utils.createResponse(404, "Not Found", "Device tidak ditemukan", `/device/${uuid}`);
      }
      await prisma.device.delete({ where: { uuid: uuid } })
    } catch (error) {
      console.error("Error while inserting device:", error);
      return utils.createResponse(500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/device/${uuid}`);
    }
    utils.webSockerUpdate(req)
    return utils.createResponse(200, "Success", "Perangkat berhasil dihapus", `/device/${uuid}`);
  },
  update: async (req, res) => {
    let uuid = req.params.uuid
    try {
      let check = await checkDeleteUpdate(uuid)
      
      if (!check) {
        return utils.createResponse(404, "Not Found", "Device tidak ditemukan", `/device/${uuid}`); 
      }
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
      return utils.createResponse(500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/device/${uuid}`);
    }
    utils.webSockerUpdate(req)
    return utils.createResponse(200, "Success", "Perangkat berhasil diupdate", `/device/${uuid}`);
  }
};
