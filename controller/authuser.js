const { PrismaClient } = require("@prisma/client");
const generator = require("../helper/generator");
const genPass = require('../helper/generator');
const utils = require('../helper/utils');
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();
module.exports = {
  login: async (req, res) => {
    if (!req.body.email || !req.body.password) {
      return res.status(400).json({ msg: "Masukan Email atau Password " });
    }
    const results = await prisma.user.findUnique({
      where: {
        email: req.body.email,
      },
    });
    if (!results) {
      return res.status(404).json({ msg: "Email Tidak Di temukan" });
    }
    let ResultPassword = await bcrypt.compare(
      req.body.password,
      results.password
    );
    if (!ResultPassword) {
      return res.status(404).json({ msg: "Password salah" });
    }
    let token = generator.generateAccessToken(
      { uuid: results.uuid, email: results.email, name: results.name },
      process.env.SECRET_TOKEN
    );
    return res.json({ token: token, name: results.name });
  },
  insert: async (req, res) => {
    const results = await prisma.user.create({
      data: {
        email: req.body.email,
        name: req.body.name,
        identityNumber: req.body.identityNumber,
        password: await genPass.generatePassword(req.body.password),
        batch: parseInt (req.body.batch),
        birtday: new Date(req.body.birtday),
        program_study: req.body.program_study,
        signature: req.body.signature,
        phoneNumber: req.body.phoneNumber,
        telegramId: req.body.telegramId,
        telegramToken: genPass.generateString(10),
        nfc_data: req.body.nfc_data,
      },
    });

    if (!results) {
      return res.status(400).json({ msg: "Data yang Diberikan Tidak Valid/Tidak Lengkap" });
    }

    return res.status(200).json({ msg: "Data yang Diberikan Tidak Valid/Tidak Lengkap" });

  },
};
