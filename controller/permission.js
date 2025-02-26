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
    let is_exist;
    is_exist = await prisma.permission.findMany({
      select: {
        uuid: true,
        name: true,
        description: true,
      },
    });
    return utils.createResponse(200, "Success", "Izin berhasil ditemukan", "/permission", { data: is_exist });
  },
  getter: async (req, res) => {
    var uuid = req.params.uuid;
    let is_exist;
    is_exist = await prisma.permission.findUnique({
      where: { uuid: uuid },
      select: {
        uuid: true,
        name: true,
        guard_name: true, 
        description: true,
      },
    });
    return utils.createResponse(200, "Success", "Izin berhasil ditemukan", `/permission/${uuid}`, { data: is_exist });
  },

  insert: async (req, res) => {
    try {
      let data = {
        name: req.body.name,
        guard_name: utils.toSnakeCase(req.body.guard_name) ?? utils.toSnakeCase(req.body.name),
        description: req.body.description
      } 
      await prisma.permission.create({data: data})
    } catch (error) {
      console.error("Error while inserting permission:", error);
      return utils.createResponse(500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", "/permission");
    }
    utils.webSockerUpdate(req)
    return utils.createResponse(200, "Success", "Izin berhasil ditambahkan", "/permission");
  },
  deleter: async (req, res) => {
    let uuid = req.params.uuid
    let check = await checkDeleteUpdate(uuid)
    if (!check) {
      return utils.createResponse(404, "Not Found", "Izin tidak ditemukan", `/permission/${uuid}`);
    }
    await prisma.permission.delete({ where: { uuid: uuid } })
    utils.webSockerUpdate(req)
    return utils.createResponse(200, "Success", "Izin berhasil dihapus", `/permission/${uuid}`);
  },
  update: async (req, res) => {
    let uuid = req.params.uuid
    let check = await checkDeleteUpdate(uuid)
    if (!check) {
      return utils.createResponse(404, "Not Found", "Izin tidak ditemukan", `/permission/${uuid}`);
    }
    try {
      let data = {
        name: req.body.name,
        description: req.body.description
      }
      if (req.body.guard_name) {
        data.guard_name = utils.toSnakeCase(req.body.guard_name)
      }
      let result = await prisma.permission.update({
        where: {
          uuid: uuid
        },
        data: data
      })
    } catch (error) {
      console.error("Error while inserting permission:", error);
      return utils.createResponse(500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/permission/${uuid}`);
    }
    utils.webSockerUpdate(req)
    return utils.createResponse(200, "Success", "Izin berhasil diupdate", `/permission/${uuid}`);
  }
};
