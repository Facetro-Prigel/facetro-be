const { PrismaClient } = require("@prisma/client");
const genPass = require('../helper/generator');
const {sendMail} = require('../helper/mailer');
const utils = require("../helper/utils");
// const { bot } = require('../helper/telegram')
const axios = require("axios");
const role_utils = require("../helper/role_utils");
const prisma = new PrismaClient();

module.exports = {
  getter_all: async (req, res) => {
    let isExist;
    isExist = await prisma.user.findMany({
      include: {
        roleuser: {
          include: {
            role: true,
          },
        },
        usergroup: {
          include: {
            group: true,
            },
        },
        
      },
    });

    res.status(200).json({ data: isExist, code: 200 });
  },
  getter: async (req, res) => {
    var uuid = req.params.uuid;
    let isExist;
    isExist = await prisma.user.findUnique({
      where: { uuid: uuid },
      include: {
        permissionUser: {
          include: {
            permission: true,
          },
        },
        roleuser: {
          include: {
            role: true,
          },
        },
        usergroup: {
          include: {
            group: true
            },
          },
      },
    });

    res.status(200).json({ data: isExist, code: 200 });
  },
  // on progress
  insert: async (req, res) => {
    if (utils.validateEmail(req.body.email) === false) {
      return res.status(400).json({ error: "Email yang diberikan tidak sesuai ketentuan" });
    }

    let variabel = {       
      email: req.body.email,
      name: req.body.name,
      identityNumber: req.body.identityNumber,
      password: await genPass.generatePassword(req.body.password),
      batch: parseInt(req.body.batch),
      birthday: new Date(req.body.birthday),
      program_study: req.body.program_study,
      signature: req.body.signature,
      phoneNumber: req.body.phoneNumber,
      telegramId: req.body.telegramId,
      telegramToken: genPass.generateString(10),
      nfc_data: req.body.nfc_data,
    };

    try {
      const results = await prisma.user.create({
        data: variabel
      });

      sendMail({name: variabel.name, email: variabel.email, password: req.body.password, token: variabel.telegramToken, bimbingan: utils.arrayToHuman(ss)});
      
      return res.status(200).json({ msg: "Selamat Data berhasil dibuat" });
    } catch (error) {
      console.error("Error while inserting user:", error);
      return res.status(500).json({ error: "Terjadi kesalahan saat memproses permintaan" });
    }
  },
  deleteUser: async (req, res) => {
    const uuid = req.params.uuid;
    const user = await prisma.user.findUnique({
      where: { uuid: uuid }
    });
    if (!user) {
      return res.status(404).json({ error: "Pengguna tidak ditemukan" });
    }
    const deletedUser = await prisma.user.delete({
      where: { uuid: uuid }
    });
    return res.status(200).json({ message: "Pengguna berhasil dihapus", code: 200 });
  },
  
};
