const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt');;
const prisma = new PrismaClient();

const generatePassword = async (password) => {
    const salt = await bcrypt.genSalt(14);
    return await bcrypt.hash(password, salt);
}
exports.run = async () =>{
    await prisma.device.createMany({
        data: [
            {
                name: "Presensi Gedung E11",
                locations: "E11-FT", 
                secret: generatePassword("PresensiGedungE112024")
            },{
                name: "Presensi Gedung E6",
                locations: "E6-FT", 
                secret: generatePassword("PresensiGedungE62024")
            },
            {
                name: "Ruang 1A",
                locations: "1A - Digital Center", 
                secret: generatePassword("Ruang1A2024")
            }
        ]
    })
}