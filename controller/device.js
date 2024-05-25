const { PrismaClient } = require('@prisma/client')
const generator = require('../helper/generator')
const prisma = new PrismaClient()
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
    if (!req.body.token) {
      return res.status(400).json({ 'msg': "Request Salah" })
    }
    const results = await prisma.device.findUnique({
      where: {
        token: req.body.token,
      }
    })
    if (!results) { return res.status(404).json({ 'msg': "Token Tidak Ditemukan" }) }
    let identityKey = generator.generateString(10)
    let token = generator.generateAccessToken({ uuid: results.uuid, identityKey: identityKey }, process.env.SECRET_DEVICE_TOKEN)
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
    return res.json({ 'token': token, 'name': results.name, 'uuid': results.uuid });
  },
  getter_all: async (req, res) => {
    let isExist;
    isExist = await prisma.device.findMany({
      select: {
        uuid: true,
        name: true,
        locations: true,
        ip_address: true,
        token: true
      },
    });
    res.status(200).json({ data: isExist, code: 200 });
  },
  getter: async (req, res) => {
    var uuid = req.params.uuid;
    let isExist;
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

    res.status(200).json({ data: isExist, code: 200 });
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
      return res.status(500).json({ error: "Terjadi kesalahan saat memproses permintaan" });
    }
    return res.status(200).json({ msg: "Perangkat sudah ditambahkan" });
  },
  deleter: async (req, res) => {
    let uuid = req.params.uuid
    let check = await checkDeleteUpdate(uuid)

    if (!check) {
      return res.status(400).json({ msg: "Device tidak ditemukan" });
    }
    await prisma.device.delete({ where: { uuid: uuid } })
    return res.status(200).json({ msg: "Device berhasil dihapus" })
  },
  update: async (req, res) => {
    let uuid = req.params.uuid
    let check = await checkDeleteUpdate(uuid)
    
    if (!check) {
      return res.status(400).json({ msg: "Device tidak ditemukan" });
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
      return res.status(400).json({ error: "Terjadi kesalahan saat memproses permintaan" });
    }
    return res.status(200).json({ msg: "Grup berhasil ubah" })
  }
};
