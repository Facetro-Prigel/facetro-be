const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient();
const random = require('../../helper/generator');
exports.run = async () =>{
    await prisma.device.createMany({
        data: [
            {
                name: "Presensi Gedung E11",
                locations: "E11-FT",
                token: random.generateString(7)
            },{
                name: "Presensi Gedung E6",
                locations: "E6-FT", 
                token: random.generateString(7)
            },
            {
                name: "Ruang 1A",
                locations: "1A - Digital Center", 
                token: random.generateString(7)
            }
        ]
    })
}