const { PrismaClient } = require('@prisma/client')
const generator = require('../helper/generator')
const utils = require('../helper/utils')
const prisma = new PrismaClient()
const checkDeleteUpdate = async (uuid, reqs) => {
  const permission = await prisma.permission.findUnique({
    where: {
      uuid: uuid
    },
    select: {
      name: true,
    }
  });
  return permission
}
module.exports = {
  getter_all: async (req, res) => {
    let isExist;
    isExist = await prisma.permission.findMany({
      select: {
        uuid: true,
        name: true,
        description: true,
      },
    });
    res.status(200).json({ data: isExist, code: 200 });
  },
  getter: async (req, res) => {
    var uuid = req.params.uuid;
    let isExist;
    isExist = await prisma.permission.findUnique({
      where: { uuid: uuid },
      select: {
        uuid: true,
        name: true,
        guardName: true, 
        description: true,
      },
    });
    res.status(200).json({ data: isExist, code: 200 });
  },

  insert: async (req, res) => {
    try {
      let data = {
        name: req.body.name,
        guardName: req.body.guardName ?? utils.toSnakeCase(req.body.name),
        description: req.body.description
      }
      let result = await prisma.device.create({
        data: data
      })
    } catch (error) {
      console.error("Error while inserting device:", error);
      return res.status(500).json({ error: "Terjadi kesalahan saat memproses permintaan" });
    }
    return res.status(200).json({ msg: "Izin sudah ditambahkan" });
  },
  deleter: async (req, res) => {
    let uuid = req.params.uuid
    let check = await checkDeleteUpdate(uuid)
    if (!check) {
      return res.status(400).json({ msg: "Izin tidak ditemukan" });
    }
    await prisma.device.delete({ where: { uuid: uuid } })
    return res.status(200).json({ msg: "Izin berhasil dihapus" })
  },
  update: async (req, res) => {
    let uuid = req.params.uuid
    let check = await checkDeleteUpdate(uuid)
    if (!check) {
      return res.status(400).json({ msg: "Izin tidak ditemukan" });
    }
    try {
      let data = {
        name: req.body.name,
        description: req.body.description
      }
      if (req.body.guardName) {
        data.guardName = req.body.guardName
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
    return res.status(200).json({ msg: "Izin berhasil ubah" })
  }
};
