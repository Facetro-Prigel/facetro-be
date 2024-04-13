const { PrismaClient } = require('@prisma/client')
const generator = require('../helper/generator')
const prisma = new PrismaClient()
module.exports = {
  register: async (req, res) => {
    if(!req.body.token){
      return res.status(400).json({ 'msg': "Request Salah" }) 
    }
    const results = await prisma.device.findUnique({
      where: {
        token: req.body.token,
      }
    })
    if (!results) { return res.status(404).json({ 'msg': "Token Tidak Ditemuakan" }) }
    let identityKey = generator.generateString(10)
    let token = generator.generateAccessToken({ uuid: results.uuid, identityKey: identityKey }, process.env.SECRET_DEVICE_TOKEN)
    await prisma.device.update({
      where: {
        token: req.body.token,
      }, 
      data: {
        token: generator.generateString(8),
        identity: await generator.generatePassword(identityKey, 10),
      }
    })
    return res.json({ 'token': token, 'name': results.name });
  }
};
