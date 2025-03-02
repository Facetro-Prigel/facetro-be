const { PrismaClient } = require("@prisma/client");
const genPass = require('../helper/generator');
const { sendMail } = require('../helper/mailer');
const utils = require("../helper/utils");
const axios = require("axios");
const role_utils = require("../helper/role_utils");
const prisma = new PrismaClient();
const inputInsertUpdate = async (req) => {
  const validationReason = {
    email: "Format email standar",
    name: "Huruf besar, kecil, dan simbol ('), (.), dan (,)",
    identity_number: "Hanya angka",
    batch: "Angka dan boleh kosong",
    birthday: "Format ulang tahun yyyy-mm-dd",
    program_study: "Huruf besar, kecil, dan boleh kosong",
    phone_number: "Format nomor telepon dan boleh kosong",
  };
  const validationRules = {
    email: /^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Format email standar
    name: /^[A-Za-z' .,]+$/, // Huruf besar, kecil, dan simbol '
    identity_number: /^\d+$/, // Hanya angka
    batch: /^\d*$/, // Angka dan boleh kosong
    birthday: /^\d{4}-\d{2}-\d{2}$/, // Format ulang tahun yyyy-mm-dd
    program_study: /^[A-Za-z\s]*$/, // Huruf besar, kecil, dan boleh kosong
    phone_number: /^[\d{3}-\d{3}-\d{4}+]*$/, // Nomor telepon boleh kosong
  };
  const validateInput = (field, value) => {
    const regex = validationRules[field];
    return regex.test(value);
  };
  let errorVali = {}
  for (const field in validationRules) {
    if(req.body[field] != undefined){
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

  let s = {
    phone_number: req.body.phone_number,
    program_study: req.body.program_study
  }
  if(req.body.batch != undefined){
    s.batch= parseInt(req.body.batch)
  }
  if(req.body.birthday){
    s.birthday= new Date(req.body.birthday)
  }

  let data = {
      email: req.body.email,
      name: req.body.name,
      identity_number: req.body.identity_number,
      user_details: {
        upsert: {
          create:s,
          update:s
        }
      }
    };
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
      uuid: uuid
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
  unnes_image: async (req, res) => {
    try {
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
      return utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat mengambil gambar dari UNNES", `/unnes_image/${identity_number}`);
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
  getter: async (req, res) => {
    let user_data;
    let uuid = req.user.uuid;
    try {

      user_data = await prisma.user.findUnique({

        where: { uuid: req.user.uuid },
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
        }
      });
    } catch (error) {
      return utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/myprofile/${uuid}`);
    }
    return utils.createResponse(res, 200, "Success", "Pengguna berhasil ditemukan", `/myprofile/${uuid}`, user_data);
  },
  update: async (req, res) => {
    let uuid = req.user.uuid
    try {
      const user = await checkDeleteUpdate(req.user.uuid, req)
      if (!user) {
        return utils.createResponse(res, 404, "Not Found", "Pengguna tidak ditemukan", `/myprofile/${req.user.uuid}`);
      }
      var data = await inputInsertUpdate(req)
      if (data.status == false) {
        return utils.createResponse(res, 400, "Bad Request", data.validateError, `/myprofile/${req.user.uuid}`, data.validateError); 
      }
      data = data.data
      data.modified_at = new Date()
      const updateUser = await prisma.user.update({
        where: { uuid: req.user.uuid },
        data: data
      });
    } catch (error) {
      console.error(error)
      return utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/myprofile`);
    }
    utils.webSockerUpdate(req)
    return utils.createResponse(res, 200, "Success", "Pengguna berhasil diperbarui", `/myprofile/${uuid}`);
  },
};
