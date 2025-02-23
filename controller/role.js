const { PrismaClient } = require('@prisma/client')
const generator = require('../helper/generator')
const utils = require('../helper/utils')
const prisma = new PrismaClient()
const checkDeleteUpdate = async (uuid, reqs) => {
  const role = await prisma.role.findUnique({
    where: {
      uuid: uuid,
      NOT: [{
        guard_name: 'super_admin'
      }]
    },
    select: {
      name: true,
    }
  });
  return role
}
const inputInsertUpdate = async (req) => {
  let data = {
    name: req.body.name,
    description: req.body.description
  }
  if (req.asign_role_to_permision && req.body.permisions) {
    data.permission_role = {
      deleteMany: {},
      create: req.body.permisions
        .filter(permission_uuid => permission_uuid !== "")
        .map(permission_uuid => ({ permission: { connect: { uuid: permission_uuid } } }))
    }
  }  
  return data
}
module.exports = {
  getter_all: async (req, res) => {
    let is_exist;
    
    is_exist = await prisma.role.findMany({
      select: {
        uuid: true,
        name: true,
        description: true,
      },
    });

    res.status(200).json({ data: is_exist, code: 200 });
  },
  getter: async (req, res) => {
    var uuid = req.params.uuid;
    let is_exist;
    is_exist = await prisma.role.findUnique({
      where: { uuid: uuid },
      select: {
        uuid: true,
        name: true,
        guard_name: true,
        description: true,
        permission_role: {
          select: {
            permission: {
              select:{
                name: true,
                uuid: true
              }
            }
          }
        }
      },
    });
    res.status(200).json({ data: is_exist, code: 200 });
  },

  insert: async (req, res) => {
    try {
      let data = await inputInsertUpdate(req)
      data.guard_name = utils.toSnakeCase(req.body.guard_name) ?? utils.toSnakeCase(req.body.name)
      let result = await prisma.role.create({
        data: data
      })
    } catch (error) {
      console.error("Error while inserting device:", error);
      return res.status(500).json(utils.createResponse(500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", "/role"));
    }
    utils.webSockerUpdate(req)
    return res.status(200).json({ msg: "Peran sudah ditambahkan" });
  },
  deleter: async (req, res) => {
    let uuid = req.params.uuid
    let check = await checkDeleteUpdate(uuid)
    if (!check) {
      return res.status(404).json(utils.createResponse(404, "Not Found", "Peran tidak ditemukan atau tidak dapat dihapus", `/role/${uuid}`));
    }
    await prisma.role.delete({ where: { uuid: uuid } })
    utils.webSockerUpdate(req)
    return res.status(200).json({ msg: "Peran berhasil dihapus " })
  },
  update: async (req, res) => {
    let uuid = req.params.uuid
    let check = await checkDeleteUpdate(uuid)
    if (!check) {
      return res.status(404).json(utils.createResponse(404, "Not Found", "Peran tidak ditemukan atau tidak dapat diubah", `/role/${uuid}`));
    }
    try {
      let data = await inputInsertUpdate(req)
      if (req.body.guard_name) {
        data.guard_name = utils.toSnakeCase(req.body.guard_name)
      }
      let result = await prisma.role.update({
        where: {
          uuid: uuid
        },
        data: data
      })
    } catch (error) {
      console.error("Error while inserting device:", error);
      return res.status(500).json(utils.createResponse(500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/role/${uuid}`));
    }
    utils.webSockerUpdate(req)
    return res.status(200).json({ msg: "Peran berhasil ubah" })
  }
};
