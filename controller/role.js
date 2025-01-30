const { PrismaClient } = require('@prisma/client')
const generator = require('../helper/generator')
const utils = require('../helper/utils')
const prisma = new PrismaClient()
const checkDeleteUpdate = async (uuid, reqs) => {
  const role = await prisma.role.findUnique({
    where: {
      uuid: uuid,
      NOT: [{
        guardName: 'super_admin'
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
    data.permisionrole = {
      deleteMany: {}, // Hapus semua relasi sebelumnya
      create: req.body.permisions
        .filter(permissionUuid => permissionUuid !== "")
        .map(permissionUuid => ({ permission: { connect: { uuid: permissionUuid } } }))
    }
  }  
  return data
}
module.exports = {
  getter_all: async (req, res) => {
    let isExist;
    
    isExist = await prisma.role.findMany({
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
    isExist = await prisma.role.findUnique({
      where: { uuid: uuid },
      select: {
        uuid: true,
        name: true,
        guardName: true,
        description: true,
        permisionrole: {
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
    res.status(200).json({ data: isExist, code: 200 });
  },

  insert: async (req, res) => {
    try {
      console.log(JSON.stringify(req.body));
      let data = await inputInsertUpdate(req)
      data.guardName = utils.toSnakeCase(req.body.guardName) ?? utils.toSnakeCase(req.body.name)
      let result = await prisma.role.create({
        data: data
      })
    } catch (error) {
      console.error("Error while inserting device:", error);
      return res.status(500).json({ error: "Terjadi kesalahan saat memproses permintaan" });
    }
    utils.webSockerUpdate(req)
    return res.status(200).json({ msg: "Peran sudah ditambahkan" });
  },
  deleter: async (req, res) => {
    let uuid = req.params.uuid
    let check = await checkDeleteUpdate(uuid)
    if (!check) {
      return res.status(400).json({ msg: "Peran tidak ditemukan / tidak dapat dihapus" });
    }
    await prisma.role.delete({ where: { uuid: uuid } })
    utils.webSockerUpdate(req)
    return res.status(200).json({ msg: "Peran berhasil dihapus " })
  },
  update: async (req, res) => {
    let uuid = req.params.uuid
    let check = await checkDeleteUpdate(uuid)
    if (!check) {
      return res.status(400).json({ msg: "Peran tidak ditemukan / tidak dapat diubah" });
    }
    try {
      let data = await inputInsertUpdate(req)
      if (req.body.guardName) {
        data.guardName = utils.toSnakeCase(req.body.guardName)
      }
      let result = await prisma.role.update({
        where: {
          uuid: uuid
        },
        data: data
      })
    } catch (error) {
      console.error("Error while inserting device:", error);
      return res.status(400).json({ error: "Terjadi kesalahan saat memproses permintaan" });
    }
    utils.webSockerUpdate(req)
    return res.status(200).json({ msg: "Peran berhasil ubah" })
  }
};
