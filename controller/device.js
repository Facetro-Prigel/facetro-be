const { PrismaClient } = require('@prisma/client')
const generator = require('../helper/generator')
const prisma = new PrismaClient()
module.exports = {
  register: async (req, res) => {
    const results = await prisma.device.findUnique({
      where: {
        token: req.body.token,
      }
    })
    if (!results) { return res.send({ 'msg': "Token Tidak Ditemuakan" }, 404) }
    let token = generator.generateAccessToken({ uuid: results.uuid, token: results.token })
    await prisma.device.update({
      where: {
        token: req.body.token,
      }, 
      data: {
        token: generator.generateString(8),
      }
    })
    return res.json({ 'token': token });
  }
};
