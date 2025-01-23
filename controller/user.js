const { PrismaClient } = require("@prisma/client");
const genPass = require('../helper/generator');
const { sendMail } = require('../helper/mailer');
const utils = require("../helper/utils");
const axios = require("axios");
const role_utils = require("../helper/role_utils");
const minioClient = require('../minioClient')
const prisma = new PrismaClient();
require('dotenv').config();

const inputInsertUpdate = async (req, updateOrInsert) => {
  const validationReason = {
    email: "Format email standar",
    name: "Huruf besar, kecil, dan simbol ('), (.), dan (,)",
    identityNumber: "Hanya angka",
    password: "Minimal 6 karakter kombinasi huruf besar, kecil, angka, dan simbol '&', '%', atau '$'",
    batch: "Angka dan boleh kosong",
    birthday: "Format ulang tahun yyyy-mm-dd",
    program_study: "Huruf besar, kecil, dan boleh kosong",
    phoneNumber: "Format nomor telepon dan boleh kosong",
    telegramId: "Angka dan boleh kosong",
    nfc_data: "Kode heksadesimal dan boleh kosong"
  };
  const validationRules = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Format email standar
    name: /^[A-Za-z' .,]+$/, // Huruf besar, kecil, dan simbol '
    identityNumber: /^\d+$/, // Hanya angka
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[&%$])[A-Za-z\d&%$]{6,}$/, // Kombinasi huruf besar, kecil, angka, dan simbol & % $
    batch: /^\d*$/, // Angka dan boleh kosong
    birthday: /^\d{4}-\d{2}-\d{2}$/, // Format ulang tahun yyyy-mm-dd
    program_study: /^[A-Za-z\s]*$/, // Huruf besar, kecil, dan boleh kosong
    phoneNumber: /^[\d{3}-\d{3}-\d{4}+]*$/, // Nomor telepon boleh kosong
    telegramId: /^[0-9]*$/, // Angka dan boleh kosong
    nfc_data: /^[0-9a-fA-F]*$/ // Kode heksadesimal dan boleh kosong
  };

  if (updateOrInsert == 'up') {
    validationRules.password = /^$|^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[&%$])[A-Za-z\d&%$]{6,}$/
  }
  const validateInput = (field, value) => {
    const regex = validationRules[field];
    return regex.test(value);
  };
  let errorVali = {}
  for (const field in validationRules) {
    const isValid = validateInput(field, req.body[field] ?? '');
    if (!isValid) {
      errorVali[field] = `Harusnya berisi ${validationReason[field]}`
    }
  }
  if (Object.keys(errorVali).length) {
    console.log(errorVali)
    return { status: false, msg: 'Check kembali masukan data anda!', validateError: errorVali }
  }
  let data = {
    email: req.body.email,
    name: req.body.name,
    identityNumber: parseInt(req.body.identityNumber).toString(),
    batch: parseInt(req.body.batch),
    birtday: new Date(req.body.birthday),
    program_study: req.body.program_study,
    phoneNumber: req.body.phoneNumber,
    telegramId: parseInt(req.body.telegramId),
    telegramToken: genPass.generateString(10),
    nfc_data: req.body.nfc_data
  };
  if (req.body.password) {
    data.password = await genPass.generatePassword(req.body.password)
  }
  if (req.asign_user_to_group && req.body.usergroup) {
    data.usergroup = {
      create: req.body.usergroup.map((projectItems) => {
        if (projectItems != "") {
          return { group: { connect: { uuid: projectItems } } }
        }
      })
    }
  }
  if (req.asign_user_to_permision && req.body.permission) {
    data.permissionUser = {
      create: req.body.permission.map((permissionItems) => {
        if (permissionItems != "") {
          return { permission: { connect: { uuid: permissionItems } } }
        }
      })
    }
  }
  if (req.asign_user_to_role && req.body.role) {
    data.roleuser = {
      create: req.body.role.map((roleItems) => {
        if (roleItems != "") {
          return { role: { connect: { uuid: roleItems } } }
        }
      })
    }
  }
  if (req.body.file_uuid) {
    try {
      tempData = await prisma.tempData.findUnique({ where: { uuid: req.body.file_uuid } })
      data.signature = tempData.data.signatureData
      data.avatar = tempData.data.image_path
      data.bbox = tempData.data.bbox
      await prisma.tempData.delete({ where: { uuid: req.body.file_uuid } })
    } catch {
      return { status: false, msg: "Id file salah" }
    }
  }
  return { status: true, data: data }
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
  birthday_image: async (req, res) => {
    var uuid = req.params.uuid;
    isExist = await prisma.user.findUnique({
      where: {
        uuid: uuid,
        AND: [
          {
            birtdayPhoto: {
              not: null,
            },
          },
          {
            birtdayPhoto: {
              not: "",
            },
          },
          {
            birtdayBbox: {
              not: null,
            },
          },
          {
            birtdayBbox: {
              not: "",
            },
          },
        ],
      },
      select: {
        name: true,
        birtday: true,
        birtdayPhoto: true,
        birtdayBbox: true,
      }
    });
    if (!isExist) {
      return res.sendFile('/home/app/no_images.png')
    }
    try {
      const stream = await minioClient.getObject('birthday', isExist.birtdayPhoto);
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      buffer = Buffer.concat(chunks);
      let BirthdayCard = await utils.MakeBirthdayCard(buffer, isExist.birtday, isExist.name, isExist.birtdayBbox)
      res.set("Content-Type", "image/jpeg");
      return res.send(BirthdayCard);
    } catch (error) {
      console.log(error)
      return res.sendFile('/home/app/no_images.png')
    }
  },
  updload_birthday: async (req, res) => {
    let image = req.body.image
    let uuid  = req.body.uuid
    let datas = {}
    let config_u = { headers: { "Content-Type": "application/json", } }
    await axios.post(`${process.env.ML_URL}build`, { image: image }, config_u).then((res) => {
      datas = res.data
    }).catch((e) => {
      return res.status(400).json({ msg: "Tidak atau terdapat banyak wajah!" })
    })
    try {
      requestImagePath = `${genPass.generateString(15)}.png`
      utils.saveImage(image, requestImagePath, 'birthday')
      datas.image_path = requestImagePath
      await prisma.user.update({
        where: { uuid: uuid },
        data: {
          birtdayPhoto: requestImagePath,
          birtdayBbox: datas.bbox
        }
      })
      return res.status(201).json({ msg: "Gambar berhasil disimpan" })
    } catch (e) {
      console.error("gagal menyimpan gambar")
    }
  },
  unnes_image: async (req, res) => {
    try {
      const identityNumber = req.body.identity_number
      let url = `${process.env.UNNES_API}/primer/user_ava/${identityNumber}/541.aspx`
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'cookie': 'cf_clearance=dxCyQam3QQ4ik5VHdf1uYqTlIr18NKOwIrwAUpCAfys-1726411014-1.2.1.1-A19b88gywzglUgELQxT9PIqixu2o5U.vjpKgeEW0hIu8WT.zZ5M4mHE3RRPAzSq4M8O7qIgv_Qo1T1GLMV50NUNfAZ60ghUBMCU9Janyhnw29mlSCLhspnagAz4vn7wvmFagyNuOcbWFz8o_bEVeLvRTfo4St7UyQS99LGe28ptNpug2a.PAY_RhOy.FgCpOKY6WW3h6txIPvArYfl7SqZFN78sddgRH0aq098a156MIReO2ctkcygMibtiS9jhYwuwF8A4ge52N18dyR2IuF2kQsewnACvHCcyoy5wUzuS9QKR1DzV_XIMCeTtFiuoXdCPSh85bnW.oKTmWioe_rgoNCoxIr2kcK7BoNLRPlZes_pp8szpAORdfu9pg01z0'
        } // Set response type to arraybuffer for binary data
      });
      const base64Image = Buffer.from(response.data, 'binary').toString('base64');
      const mimeType = response.headers['content-type'];
      const base64Data = `data:${mimeType};base64,${base64Image}`;
      if (mimeType == 'image-png') {
        return res.status(404).json({ msg: "Gambar tersebut tidak tersedia" })
      }

      return res.status(200).json({ msg: "Gambar UNNES berhasil diambil", data: base64Data })
    } catch (error) {
      return res.status(400).json({ msg: "Gagal mengambil data", msg: error })
    }

  },
  updload_image: async (req, res) => {
    let image = req.body.image
    let datas = {}
    let config_u = { headers: { "Content-Type": "application/json", } }
    await axios.post(`${process.env.ML_URL}build`, { image: image }, config_u).then((res) => {
      datas = res.data
    }).catch((e) => {
      return res.status(400).json({ msg: "Tidak atau terdapat banyak wajah!" })
    })
    try {
      requestImagePath = `photos/${genPass.generateString(23)}.jpg`
      utils.saveImage(image, requestImagePath)
      datas.image_path = requestImagePath
      let uuid = await prisma.tempData.create({ data: { data: datas } })
      return res.status(201).json({ msg: "gambar berhasil disimpan", file_uuid: uuid.uuid })
    } catch (e) {
      console.error("gagal menyimpan gambar")
    }
  },
  getter_all: async (req, res) => {
    let isExist;
    isExist = await prisma.user.findMany({
      orderBy: [
        {
          createdAt: 'desc'
        }
      ],
      select: {
        uuid: true,
        name: true,
        identityNumber: true,
        avatar: true,
        bbox: true,
        createdAt: true,
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
    let variabel
    try {
      variabel = await inputInsertUpdate(req, 'in')
    } catch (error) {
      return res.status(400).json({ msg: "Input yang berikan tidak sesuai!" });
    }
    if (variabel.status == false) {
      return res.status(400).json({ msg: variabel.msg, code: 400, validateError: variabel.validateError })
    }
    if (variabel.data.nfc_data == '3D002CE6') {
      try {
        const updatedPerson = await prisma.user.updateMany({
          where: {
            nfc_data: '3D002CE6',
          },
          data: {
            nfc_data: null,
          },
        });
        console.log('Update berhasil:', updatedPerson);
      } catch (error) {
        console.error('Error saat mengubah nfc_data:', error);
      }
    }
    try {
      const results = await prisma.user.create({
        data: variabel.data
      });

      // sendMail({ name: variabel.name, email: variabel.email, password: req.body.password, token: variabel.telegramToken, bimbingan: utils.arrayToHuman(ss) });
      utils.webSockerUpdate(req)
      return res.status(200).json({ msg: "Selamat pengguna berhasil dibuat" });
    } catch (error) {
      console.error("Error while inserting user:", error);
      return res.status(400).json({ msg: "Terjadi kesalahan saat memproses permintaan" });
    }
  },


  update: async (req, res) => {
    const uuid = req.params.uuid;
    const user = await checkDeleteUpdate(uuid, req)
    if (!user) {
      return res.status(404).json({ msg: "Pengguna tidak ditemukan / tidak dapat diubah" });
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
    var data = await inputInsertUpdate(req, 'up')
    if (data.status == false) {
      return res.status(400).json({ msg: data.msg, code: 400, validateError: data.validateError })
    }
    data = data.data
    data.modifiedAt = new Date()
    const updateUser = await prisma.user.update({
      where: { uuid: uuid },
      data: data
    });
    utils.webSockerUpdate(req)
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
    utils.webSockerUpdate(req)
    return res.status(200).json({ msg: "Pengguna berhasil dihapus", code: 200 });
  },

};
