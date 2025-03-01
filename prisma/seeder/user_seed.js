const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const genPass = require('../../helper/generator');
exports.run = async () => {
    list_of 
    await prisma.user.create({
        data:
        {
            name: "Muhammad Iqbal",
            identityNumber: "5312421026",
            password: await genPass.generatePassword("Leb4hG@nt3ng"),
            email: "xmod3905@students.unnes.ac.id",
            telegramToken: "cZQJlk8Ap0",
            roleuser: {
                create: {
                    role: {
                        connect: {
                            guard_name: 'super_admin',
                        }
                    }
                }
            }
        }
    })
    for (let items of lecture_user_seed) {
        await prisma.user.create({
            data:
            {
                name: "Dr. Anan Nugroho, S.T., M.Eng.",
                identityNumber: "198409052019031006",
                password: await genPass.generatePassword("Anan2024"),
                email: "anannugroho@mail.unnes.ac.id",
                telegramToken: "zPDHDvvvwN",
                roleuser: {
                    create: {
                        role: {
                            connect: {
                                guard_name: 'admin',
                            }
                        }
                    }
                }
            }
        })
    }
}