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
    birthday: /^(\d{4}-\d{2}-\d{2})?$/, // Format ulang tahun yyyy-mm-dd
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
    if ((updateOrInsert === 'up' && req.body[field] !== undefined) ||
      (updateOrInsert !== 'up')) {
      const isValid = validateInput(field, req.body[field] ?? '');
      if (!isValid) {
        errorVali[field] = `Harusnya berisi ${validationReason[field]}`
      }
    }
  }
  if (Object.keys(errorVali).length) {
    console.log(errorVali)
    return { status: false, msg: 'Check kembali masukan data anda!', validateError: errorVali }
  }
  let data = {
    email: req.body.email,
    name: req.body.name,
    identity_number: req.body.identity_number,
    telegram_id: parseInt(req.body.telegram_id),
    telegram_token: genPass.generateString(10),
    nfc_data: req.body.nfc_data
  };
  if (updateOrInsert == 'up') {
    let s = {
      phone_number: req.body.phone_number,
      program_study: req.body.program_study
    }
    if (req.body.batch != undefined) {
      s.batch = parseInt(req.body.batch)
    }
    if (req.body.birthday) {
      s.birthday = new Date(req.body.birthday)
    }
    data.user_details = {
      upsert: {
        create: s,
        update: s
      },
    };
  } else {
    data.user_details = {
      create: {
        phone_number: req.body.phone_number,
        batch: parseInt(req.body.batch),
        birthday: new Date(req.body.birthday),
        program_study: req.body.program_study
      }
    };
  }
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
    let uuid = req.body.uuid
    let datas = {}
    let config_u = { headers: { "Content-Type": "application/json", } }
    await axios.post(`${process.env.ML_URL}build`, { image: image }, config_u).then((res) => {
      datas = res.data
    }).catch((e) => {
      return utils.createResponse(res, 401, "Unauthorized", "Tidak ada atau terdapat banyak wajah!", `/birthday`);
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
      return utils.createResponse(res, 201, "Created", "gambar berhasil disimpan", `/birthday`);
    } catch (e) {
      console.error("gagal menyimpan gambar")
      return utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/birthday`);
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
        return utils.createResponse(res, 404, "Not Found", "Gambar tersebut tidak tersedia", `/unnes_image/${identity_number}`);
      }

      return utils.createResponse(res, 200, "Success", "Gambar UNNES berhasil diambil", `/unnes_image/${identity_number}`, base64Data);
    } catch (error) {
      return utils.createResponse(res, 404, "Not Found", "Gambar tersebut tidak tersedia", `/unnes_image/${identity_number}`);
    }

  },
  updload_image: async (req, res) => {
    let image = req.body.image
    let datas = {}
    let config_u = { headers: { "Content-Type": "application/json", } }
    await axios.post(`${process.env.ML_URL}build`, { image: image }, config_u).then((res) => {
      datas = res.data
    }).catch((e) => {
      return utils.createResponse(res, 400, "Bad Request", "Tidak ada atau terdapat banyak wajah!", `/image`);
    })
    try {
      requestImagePath = `photos/${genPass.generateString(23)}.jpg`
      utils.saveImage(image, requestImagePath)
      datas.image_path = requestImagePath
      let uuid = await prisma.tempData.create({ data: { data: datas } })
      return utils.createResponse(res, 201, "Created", "gambar berhasil disimpan", `/image`, { file_uuid: uuid.uuid, path: datas.image_path })
    } catch (e) {
      console.error("gagal menyimpan gambar")
      return utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/image`);
    }
  },
  getter_all: async (req, res) => {
    let users;
    try {
      users = await prisma.user.findMany({
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
    } catch (error) {
      console.error("Terjadi masalah saat mengambil data user", error);
      utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", "/user");
    }

    return utils.createResponse(res, 200, "Success", "User berhasil ditemukan", "/user", users);
  },
  getter: async (req, res) => {
    var uuid = req.params.uuid;
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { uuid: uuid },
        select: {
          uuid: true,
          name: true,
          identity_number: true,
          email: true,
          bbox: true,
          avatar: true,
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
          user_details: {
            select: {
              phone_number: true,
              batch: true,
              birthday: true,
              program_study: true
            }
          }
        },
      });
    } catch (error) {
      console.error("Terjadi masalah saat mengambil data user", error);
      utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/user/${uuid}`);
    }

    return utils.createResponse(res, 200, "Success", "User berhasil ditemukan", `/user/${uuid}`, user);
  },

  insert: async (req, res) => {
    let variabel
    try {
      variabel = await inputInsertUpdate(req, 'in')
    } catch (error) {
      return utils.createResponse(res, 400, "Bad Request", "Input yang diberikan tidak valid!", "/user");
    }
    if (variabel.status == false) {
      return utils.createResponse(res, 400, "Bad Request", "Ada yang salah dengan input yang Anda berikan!", "/user", variabel.validateError);
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
      return utils.createResponse(res, 200, "Success", "Selamat pengguna berhasil dibuat", "/user");
    } catch (error) {
      console.error("Error while inserting user:", error);
      return utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", "/user");
    }
  },


  update: async (req, res) => {
    const uuid = req.params.uuid;
    try {
      const user = await checkDeleteUpdate(uuid, req)
      if (!user) {
        return utils.createResponse(res, 404, "Not Found", "Pengguna tidak ditemukan / tidak dapat diubah", `/user/${uuid}`);
      }
      await prisma.userGroup.deleteMany({
        where: { user_uuid: uuid }
      })
      await prisma.roleUser.deleteMany({
        where: { user_uuid: uuid }
      })
      await prisma.permissionUser.deleteMany({
        where: { user_uuid: uuid }
      })
      var data = await inputInsertUpdate(req, 'up')
      if (data.status == false) {
        return utils.createResponse(res, 400, "Bad Request", `Ada yang salah dengan input yang Anda berikan!`, `/user/${uuid}`, data.validateError);
      }
      data = data.data
      data.modified_at = new Date()
      await prisma.user.update({
        where: { uuid: uuid },
        data: data
      });
    } catch (error) {
      console.log(error)
      utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permisntaan", `/user/${uuid}`);
    }
    utils.webSockerUpdate(req)
    return utils.createResponse(res, 200, "Success", "Pengguna berhasil diperbarui", `/user/${uuid}`);
  },

  deleteUser: async (req, res) => {
    const uuid = req.params.uuid;
    try {

      const user = await checkDeleteUpdate(uuid, req)
      if (!user) {
        return utils.createResponse(res, 404, "Not Found", "Pengguna tidak ditemukan / tidak dapat dihapus", `/user/${uuid}`);
      }
      const deletedUser = await prisma.user.delete({
        where: { uuid: uuid }
      });
    } catch (error) {
      utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/user/${uuid}`);
    }
    utils.webSockerUpdate(req)
    return utils.createResponse(res, 200, "Success", "Pengguna berhasil dihapus", `/user/${uuid}`);
  },

};
