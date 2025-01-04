const { PrismaClient } = require("@prisma/client");
const genPass = require('../helper/generator');
const { sendMail } = require('../helper/mailer');
const utils = require("../helper/utils");
const axios = require("axios");
const role_utils = require("../helper/role_utils");
const prisma = new PrismaClient();
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
    }).catch(( e) => {
      return res.status(400).json({ msg: "Tidak atau terdapat banyak wajah!"})
    })
    try {
      requestImagePath = `photos/${genPass.generateString(23)}.jpg`
      utils.saveImage(image, requestImagePath)
      datas.image_path = requestImagePath
      let uuid = await prisma.tempData.create({ data: { data: datas } })
      return res.status(200).json({ msg: "gambar berhasil disimpan", file_uuid: uuid.uuid, path: datas.image_path })
    } catch (e) {
      console.error("gagal menyimpan gambar")
    }
  },
  getter: async (req, res) => {
    let isExist;
    isExist = await prisma.user.findUnique({
      
      where: { uuid: req.user.uuid },
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
  update: async (req, res) => {
    const user = await checkDeleteUpdate(req.user.uuid, req)
    if (!user) {
      return res.status(404).json({ msg: "Pengguna tidak ditemukan / tidak dapat diubah" });
    }
    var data = await inputInsertUpdate(req, 'up')
    if (data.status == false) {
      return res.status(400).json({ msg: data.msg, code: 400, validateError: data.validateError })
    }
    data = data.data
    data.modifiedAt = new Date()
    const updateUser = await prisma.user.update({
      where: { uuid: req.user.uuid },
      data: data
    });
    utils.webSockerUpdate(req)
    return res.status(200).json({ message: "Pengguna berhasil diperbarui", code: 200 });
  },
};
