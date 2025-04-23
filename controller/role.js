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

const inputInsertUpdate = async (req, mode = "insert") => {
  let data = {
    name: req.body.name,
    description: req.body.description
  }

  if (req.body.guard_name) {
    const permissionUuids = req.body.permission_role?.filter(uuid => uuid !== "") || [];

    data.permission_role = {
      create: permissionUuids.map(permission_uuid => ({
        permission: {
          connect: { uuid: permission_uuid }
        }
      }))
    }

    if (mode == "update") {
      data.permission_role.deleteMany = {}; // Hapus semua permission lama
    }
  }

  return data;
}

module.exports = {
  getter_all: async (req, res) => {
    let roles;
    try {
      roles = await prisma.role.findMany({
        select: {
          uuid: true,
          name: true,
          description: true,
        },
      });
    } catch (error) {
      return utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", "/role");
    }

    return utils.createResponse(res, 200, "Success", "Peran berhasil ditemukan", "/role", roles);
  },
  getter: async (req, res) => {
    var uuid = req.params.uuid;
    let role;
    try {
      role = await prisma.role.findUnique({
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
    } catch (error) {
      return utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/role/${uuid}`);
    }
    return utils.createResponse(res, 200, "Success", "Peran berhasil ditemukan", `/role/${uuid}`, role);
  },

  insert: async (req, res) => {
    try {
      let data = await inputInsertUpdate(req, "insert")
      data.guard_name = utils.toSnakeCase(req.body.guard_name) ?? utils.toSnakeCase(req.body.name)
      let result = await prisma.role.create({
        data: data
      })
    } catch (error) {
      console.error("Error while inserting device:", error);
      return utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", "/role");
    }
    utils.webSockerUpdate(req)
    return utils.createResponse(res, 200, "Success", "Peran berhasil ditambahkan", "/role");
  },
  deleter: async (req, res) => {
    let uuid = req.params.uuid
    let check = await checkDeleteUpdate(uuid)
    if (!check) {
      return utils.createResponse(res, 404, "Not Found", "Peran tidak ditemukan atau tidak dapat dihapus", `/role/${uuid}`);
    }
    await prisma.role.delete({ where: { uuid: uuid } })
    utils.webSockerUpdate(req)
    return utils.createResponse(res, 200, "Success", "Peran berhasil dihapus", `/role/${uuid}`);
  },
  update: async (req, res) => {
    let uuid = req.params.uuid
    let check = await checkDeleteUpdate(uuid)
    if (!check) {
      return utils.createResponse(res, 404, "Not Found", "Peran tidak ditemukan atau tidak dapat diubah", `/role/${uuid}`);
    }
    try {
      let data = await inputInsertUpdate(req, "update")
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
      return utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/role/${uuid}`); 
    }
    utils.webSockerUpdate(req)
    return utils.createResponse(res, 200, "Success", "Peran berhasil diubah", `/role/${uuid}`);
  }
};
