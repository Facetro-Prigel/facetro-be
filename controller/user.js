const { PrismaClient } = require("@prisma/client");
const genPass = require('../helper/generator');
const { sendMail } = require('../helper/mailer');
const utils = require("../helper/utils");
const axios = require("axios");
const role_utils = require("../helper/role_utils");
const minioClient = require('../minioClient')
const prisma = new PrismaClient();
const inputInsertUpdate = async (req, updateOrInsert) => {
  const validationReason = {
    email: "Format email standar",
    name: "Huruf besar, kecil, dan simbol ('), (.), dan (,)",
    identity_number: "Hanya angka",
    password: "Minimal 6 karakter kombinasi huruf besar, kecil, angka, dan simbol '&', '%', atau '$'",
    batch: "Angka dan boleh kosong",
    birthday: "Format ulang tahun yyyy-mm-dd",
    program_study: "Huruf besar, kecil, dan boleh kosong",
    phone_number: "Format nomor telepon dan boleh kosong",
    telegram_id: "Angka dan boleh kosong",
    nfc_data: "Kode heksadesimal dan boleh kosong"
  };
  const validationRules = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Format email standar
    name: /^[A-Za-z' .,]+$/, // Huruf besar, kecil, dan simbol '
    identity_number: /^\d+$/, // Hanya angka
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[&%$])[A-Za-z\d&%$]{6,}$/, // Kombinasi huruf besar, kecil, angka, dan simbol & % $
    batch: /^\d*$/, // Angka dan boleh kosong
    birthday: /^\d{4}-\d{2}-\d{2}$/, // Format ulang tahun yyyy-mm-dd
    program_study: /^[A-Za-z\s]*$/, // Huruf besar, kecil, dan boleh kosong
    phone_number: /^[\d{3}-\d{3}-\d{4}+]*$/, // Nomor telepon boleh kosong
    telegram_id: /^[0-9]*$/, // Angka dan boleh kosong
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
    identity_number: parseInt(req.body.identity_number).toString(),
    batch: parseInt(req.body.batch),
    birthday: new Date(req.body.birthday),
    program_study: req.body.program_study,
    phone_number: req.body.phone_number,
    telegram_id: parseInt(req.body.telegram_id),
    telegram_token: genPass.generateString(10),
    nfc_data: req.body.nfc_data
  };
  if (req.body.password) {
    data.password = await genPass.generatePassword(req.body.password)
  }
  if (req.asign_user_to_group && req.body.usergroup) {
    data.user_group = {
      create: req.body.usergroup.map((projectItems) => {
        if (projectItems != "") {
          return { group: { connect: { uuid: projectItems } } }
        }
      })
    }
  }
  if (req.asign_user_to_permision && req.body.permission) {
    data.permission_user = {
      create: req.body.permission.map((permissionItems) => {
        if (permissionItems != "") {
          return { permission: { connect: { uuid: permissionItems } } }
        }
      })
    }
  }
  if (req.asign_user_to_role && req.body.role) {
    data.role_user = {
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
        role_user: {
          some: {
            role: {
              is: {
                guard_name: 'super_admin'
              }
            }
          }
        }
      }]
    },
    select: {
      created_at: true,
      role_user: {
        select: {
          role: {
            select: {
              guard_name: true
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
            birthday_photo: {
              not: null,
            },
          },
          {
            birthday_photo: {
              not: "",
            },
          },
          {
            birthday_bbox: {
              not: null,
            },
          },
          {
            birthday_bbox: {
              not: "",
            },
          },
        ],
      },
      select: {
        name: true,
        birthday: true,
        birthday_photo: true,
        birthday_bbox: true,
      }
    });
    if (!isExist) {
      return res.sendFile('/home/app/no_images.png')
    }
    try {
      const stream = await minioClient.getObject('birthday', isExist.birthday_photo);
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      buffer = Buffer.concat(chunks);
      let BirthdayCard = await utils.MakeBirthdayCard(buffer, isExist.birthday, isExist.name, isExist.birthday_bbox)
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
      return res.status(401).json(utils.createResponse(401, "Unauthorized", "Tidak ada atau terdapat banyak wajah!", `/birthday`));
    })
    try {
      requestImagePath = `${genPass.generateString(15)}.png`
      utils.saveImage(image, requestImagePath, 'birthday')
      datas.image_path = requestImagePath
      await prisma.user.update({
        where: { uuid: uuid },
        data: {
          birthday_photo: requestImagePath,
          birthday_bbox: datas.bbox
        }
      })
      return res.status(200).json({ msg: "Gambar berhasil disimpan" })
    } catch (e) {
      console.error("gagal menyimpan gambar")
      return res.status(500).json(utils.createResponse(500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/birthday`));
    }
  },
  unnes_image: async (req, res) => {
    try {
      console.log(JSON.stringify(req.body));
      const identity_number = req.body.identity_number
      let url = `${process.env.UNNES_API}/primer/user_ava/${identity_number}/541.aspx`
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
        return res.status(404).json(utils.createResponse(404, "Not Found", "Gambar tersebut tidak tersedia", `/unnes_image/${identity_number}`));
      }

      return res.status(200).json({ msg: "Gambar UNNES berhasil diambil", data: base64Data })
    } catch (error) {
      return res.status(500).json(utils.createResponse(500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/unnes_image/${identity_number}`));
    }

  },
  updload_image: async (req, res) => {
    let image = req.body.image
    let datas = {}
    let config_u = { headers: { "Content-Type": "application/json", } }
    await axios.post(`${process.env.ML_URL}build`, { image: image }, config_u).then((res) => {
      datas = res.data
    }).catch((e) => {
      return res.status(401).json(utils.createResponse(401, "Unauthorized", "Tidak ada atau terdapat banyak wajah!", `/image`));
    })
    try {
      requestImagePath = `photos/${genPass.generateString(23)}.jpg`
      utils.saveImage(image, requestImagePath)
      datas.image_path = requestImagePath
      let uuid = await prisma.tempData.create({ data: { data: datas } })
      return res.status(201).json({ msg: "gambar berhasil disimpan", file_uuid: uuid.uuid })
    } catch (e) {
      console.error("gagal menyimpan gambar")
      return res.status(500).json(utils.createResponse(500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/image`));
    }
  },
  getter_all: async (req, res) => {
    let isExist;
    isExist = await prisma.user.findMany({
      orderBy: [
        {
          created_at: 'desc'
        }
      ],
      select: {
        uuid: true,
        name: true,
        identity_number: true,
        avatar: true,
        bbox: true,
        created_at: true,
        role_user: {
          select: {
            role: {
              select: {
                name: true
              }
            },
          },
        },
        user_group: {
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
        identity_number: true,
        email: true,
        batch: true,
        birthday: true,
        program_study: true,
        bbox: true,
        avatar: true,
        phone_number: true,
        telegram_id: true,
        nfc_data: true,
        permission_user: {
          select: {
            uuid: true,
            permission: {
              select: {
                uuid: true,
                name: true,
                guard_name: true
              }
            },
          },
        },
        role_user: {
          select: {
            uuid: true,
            role: {
              select: {
                uuid: true,
                name: true,
                guard_name: true
              }
            },
          },
        },
        user_group: {
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
      return res.status(400).json(utils.createResponse(400, "Bad Request", "Input yang diberikan tidak valid!", "/user"));
    }
    if (variabel.status == false) {
      return res.status(400).json(utils.createResponse(400, "Bad Request", `Ada yang salah dengan input yang Anda berikan!\nKeterangan: ${variabel.msg}\n${variabel.validateError}`, "/user"))
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

      // sendMail({ name: variabel.name, email: variabel.email, password: req.body.password, token: variabel.telegram_token, bimbingan: utils.arrayToHuman(ss) });
      utils.webSockerUpdate(req)
      return res.status(200).json({ msg: "Selamat pengguna berhasil dibuat" });
    } catch (error) {
      console.error("Error while inserting user:", error);
      return res.status(500).json(utils.createResponse(500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", "/user"));
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
