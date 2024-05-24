const { PrismaClient } = require("@prisma/client");
const genPass = require('../helper/generator');
const { sendMail } = require('../helper/mailer');
const utils = require("../helper/utils");
// const { bot } = require('../helper/telegram')
const axios = require("axios");
const role_utils = require("../helper/role_utils");
const prisma = new PrismaClient();
const inputInsertUpdate = async (req) => {
  let data = {
    email: req.body.email,
    name: req.body.name,
    identityNumber: req.body.identityNumber,
    password: await genPass.generatePassword(req.body.password),
    batch: parseInt(req.body.batch),
    birtday: new Date(req.body.birthday),
    program_study: req.body.program_study,
    phoneNumber: req.body.phoneNumber,
    telegramId: req.body.telegramId,
    telegramToken: genPass.generateString(10),
    nfc_data: req.body.nfc_data,
    usergroup: {
      create: req.body.usergroup.map((projectItems) => {
        if (projectItems != "") {
          return { group: { connect: { uuid: projectItems } } }
        }
      })
    },
    roleuser: {
      create: req.body.role.map((roleItems) => {
        if (roleItems != "") {
          return { role: { connect: { uuid: roleItems } } }
        }
      })
    },
    permissionUser: {
      create: req.body.permission.map((permissionItems) => {
        if (permissionItems != "") {
          return { permission: { connect: { uuid: permissionItems } } }
        }
      })
    }
  };
  if(req.body.file_uuid){
    try{
      tempData = await prisma.tempData.findUnique({where:{uuid: req.body.file_uuid}})
      data.signature= tempData.data.signatureData
      data.avatar= tempData.data.image_path
      data.bbox= tempData.data.bbox
      await prisma.tempData.delete({where:{uuid: req.body.file_uuid}})
    }catch{
      return false

    }
  }
  return data
}
const checkDeleteUpdate = async (uuid, reqs) => {
  const user = await prisma.user.findUnique({
    where: {
      uuid: uuid,
      NOT: [{
        roleuser: {
          some: {
            role: {
              is: {
                guardName: 'super_admin'
              }
            }
          }
        }
      }]
    },
    select: {
      createdAt: true,
      roleuser: {
        select: {
          role: {
            select: {
              guardName: true
            }
          }
        }
      }
    }
  });
  return user
}
module.exports = {
  updload_image: async (req, res) => {
    let image = req.body.image
    let datas
    let config_u = { headers: { "Content-Type": "application/json", } }
    await axios.post(`${process.env.ML_URL}build`, { image: image }, config_u).then((res) => {
      datas = res.data
      console.log(res.data)
    }).catch((e) => {
      return res.status(400).json({msg: "Tidak atau terdapat banyak wajah!"})
    })
    requestImagePath = `photos/${genPass.generateString(23)}.jpg`
    utils.saveImage(image, requestImagePath)
    datas.image_path = requestImagePath
    let uuid = await prisma.tempData.create({data: {data: datas}})
    return res.status(201).json({msg: "gambar berhasil disimpan", file_uuid: uuid.uuid})
  },
  getter_all: async (req, res) => {
    let isExist;
    isExist = await prisma.user.findMany({
      select: {
        uuid: true,
        name: true,
        identityNumber: true,
        avatar: true,
        bbox: true,
        roleuser: {
          select: {
            role: {
              select: {
                name: true
              }
            },
          },
        },
        usergroup: {
          select: {
            group: {
              select: {
                name: true
              }
            },
          },
        },
      }
    });

    res.status(200).json({ data: isExist, code: 200 });
  },
  getter: async (req, res) => {
    var uuid = req.params.uuid;
    let isExist;
    isExist = await prisma.user.findUnique({
      where: { uuid: uuid },
      select: {
        uuid: true,
        name: true,
        identityNumber: true,
        email: true,
        batch: true,
        birtday: true,
        program_study: true,
        bbox: true,
        avatar: true,
        phoneNumber: true,
        telegramId: true,
        nfc_data: true,
        permissionUser: {
          select: {
            uuid: true,
            permission: {
              select: {
                uuid: true,
                name: true,
                guardName: true
              }
            },
          },
        },
        roleuser: {
          select: {
            uuid: true,
            role: {
              select: {
                uuid: true,
                name: true,
                guardName: true
              }
            },
          },
        },
        usergroup: {
          select: {
            uuid: true,
            group: {
              select: {
                uuid: true,
                name: true
              }
            }
          },
        },
      },
    });

    res.status(200).json({ data: isExist, code: 200 });
  },

  insert: async (req, res) => {
    let variabel = await inputInsertUpdate(req)
    if (variabel == false){
      return res.status(400).json({msg: "Id file salah", code: 400})
    }
    try {
      const results = await prisma.user.create({
        data: variabel
      });

      // sendMail({ name: variabel.name, email: variabel.email, password: req.body.password, token: variabel.telegramToken, bimbingan: utils.arrayToHuman(ss) });

      return res.status(200).json({ msg: "Selamat Data berhasil dibuat"});
    } catch (error) {
      console.error("Error while inserting user:", error);
      return res.status(500).json({ error: "Terjadi kesalahan saat memproses permintaan" });
    }
  },


  updateUser: async (req, res) => {
    const uuid = req.params.uuid;
    const user = await checkDeleteUpdate(uuid, req)
    if (!user) {
      return res.status(404).json({ error: "Pengguna tidak ditemukan / tidak dapat diubah" });
    }
    await prisma.userGroup.deleteMany({
      where: { userUuid: uuid }
    })
    await prisma.roleUser.deleteMany({
      where: { userUuid: uuid }
    })
    await prisma.permissionUser.deleteMany({
      where: { userUuid: uuid }
    })
    var data = await inputInsertUpdate(req)
    if (data == false){
      return res.status(400).json({msg: "Id file salah", code: 400})
    }
    data.modifiedAt = new Date()
    const updateUser = await prisma.user.update({
      where: { uuid: uuid },
      data: data
    });
    return res.status(200).json({ message: "Pengguna berhasil diperbarui", code: 200 });
  },

  deleteUser: async (req, res) => {
    const uuid = req.params.uuid;
    const user = await checkDeleteUpdate(uuid, req)
    if (!user) {
      return res.status(404).json({ error: "Pengguna tidak ditemukan / tidak dapat dihapus" });
    }
    const deletedUser = await prisma.user.delete({
      where: { uuid: uuid }
    });
    return res.status(200).json({ message: "Pengguna berhasil dihapus", code: 200 });
  },

};
