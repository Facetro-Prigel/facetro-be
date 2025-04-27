const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient();
const random = require('../../helper/generator');
exports.run = async () =>{
    await prisma.device.createMany({
        data: [
            {
                name: "APEL DEKANAT",
                locations: "FIPP-DEKANAT",
                token: random.generateString(7),
                identity: await random.generatePassword(random.generateString(20))
            }
        ]
    })
}