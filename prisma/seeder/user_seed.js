const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
const generatePassword = async (password) => {
    const salt = await bcrypt.genSalt(14);
    return await bcrypt.hash(password, salt);
}
exports.run = async () => {
    const user_seed = await prisma.user.create({
        data:
        {
            name: "Muhammad Iqbal",
            identityNumber: "5312421026",
            password: await generatePassword("Leb4hG@nt3ng"),
            email: "xmod3905@students.unnes.ac.id",
            roleuser: {
                create: {
                    role: {
                        connect: {
                            guardName: 'super_admin',
                        }
                    }
                }
            }
        }
    })

    await prisma.user.create({
        data:
        {
            name: "Dr. Anan Nugroho, S.T., M.Eng.",
            identityNumber: "198409052019031006",
            password: await generatePassword("Anan2024"),
            email: "anannugroho@mail.unnes.ac.id",
            roleuser: {
                create: {
                    role: {
                        connect: {
                            guardName: 'admin',
                        }
                    }
                }
            }
        }
    })
    const lecture_user_seed = [
        {
            identityNumber: "197808222003121002",
            name: "Dr. Feddy Setio Pribadi, S.Pd., M.T.",
            email: "feddy.setio@mail.unnes.ac.id"
        },
        {
            name: "Febry Putra Rochim, S.T., M.Eng.",
            identityNumber: "199202282022031011",
            email: "febry.putra@mail.unnes.ac.id"
        },
        {
            name: "Ahmad Fashiha Hastawan, S.T., M.Eng.",
            identityNumber: "198802102018031001",
            email: "ahmad.fashiha@mail.unnes.ac.id"
        },
        {
            identityNumber: "196306281990021001",
            name: "Dr. Djuniadi, M.T.",
            email: "djuniadi@mail.unnes.ac.id"
        },
        {
            identityNumber: "198303072012121004",
            name: "Nur Iksan, S.T., M.Kom.",
            email: "nur.iksan@mail.unnes.ac.id"
        },
        {
            identityNumber: "1993120720230812001",
            name: "Abdurrakhman Hamid Al-Azhari, S.T., M.T.",
            email: "abdurrakhmanhamid@mail.unnes.ac.id"
        },
        {
            identityNumber: "198801072022031004",
            name: "Syahroni Hidayat, S.T., M.Eng.",
            email: "abdurrakhmanhamid@mail.unnes.ac.id"
        }
    ]

    lecture_user_seed.map(async (items) => {
        let password = items.name.replace('Dr. ', '').replace(',', '').split(" ")[0]+"2023"
        console.log(items.name, items.identityNumber, password)
        data = {
            data:{
                name: items.name,
                identityNumber: items.identityNumber,
                password: await generatePassword(password),
                email: items.identityNumber,
                roleuser: {
                    create: {
                        role: {
                            connect: {
                                guardName: 'lecture',
                            }
                        }
                    }
                }
            }
        }
        await prisma.user.create(data)
        return data
    });
}