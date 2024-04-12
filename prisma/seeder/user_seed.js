const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const genPass = require('../../helper/generator');
const utils = require('../../helper/utils');
const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');
const ml_url = "http://localhost:5039/"
exports.run = async () => {
    const user_seed = await prisma.user.create({
        data:
        {
            name: "Muhammad Iqbal",
            identityNumber: "5312421026",
            password: await genPass.generatePassword("Leb4hG@nt3ng"),
            email: "xmod3905@students.unnes.ac.id",
            birtday: new Date("2003-05-01"),
            batch: 2021,
            program_study: "Teknik Komputer",
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
            password: await genPass.generatePassword("Anan2024"),
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
            email: "muh.iqbalg1@gmail.com"
        }
    ]
    for (let items of lecture_user_seed) {
        let password = items.name.replace('Dr. ', '').replace(',', '').split(" ")[0]+"2023"
        console.log(items.name, items.identityNumber, password)
        data = {
            data:{
                name: items.name,
                identityNumber: items.identityNumber,
                password: await genPass.generatePassword(password),
                email: items.email,
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
    }
    
    const prigel_user_seed = [
        {
            identityNumber: "4612421017",
            name: "LUTHFIYANTO",
            email: "luthfiyantooo@students.unnes.ac.id",
            batch: 2021,
            program_study: "Sistem Informasi",
            birtday: new Date("2004-02-26")
        },
        {
            identityNumber: "4611421040",
            name: "ROBERT PANCA R. SIMANJUNTAK",
            email: "simanjuntak101001@students.unnes.ac.id",
            batch: 2021,
            program_study: "Teknik Informatika",
            birtday: new Date("2001-10-10")
        },
        {
            identityNumber: "4611421013",
            name: "HILMI SYAMSUDIN",
            email: "hilmisyamsudin@students.unnes.ac.id",
            batch: 2021,
            program_study: "Teknik Informatika",
            birtday: new Date("2003-03-19")
        },
        {
            identityNumber: "4611421026",
            name: "BURHAN AHMAD",
            email: "bur3112003@students.unnes.ac.id",
            batch: 2021,
            program_study: "Teknik Informatika",
            birtday: new Date("2003-01-31")
        },
        {
            identityNumber: "4611421104",
            name: "REYHAN HERDIYANTO",
            email: "reyhanherdiyanto180603@students.unnes.ac.id",
            batch: 2021,
            program_study: "Teknik Informatika",
            birtday: new Date("2003-06-18")
        },
        {
            identityNumber: "4612421007",
            name: "IKHSAN RAHMATDHANU",
            email: "ikhsanrahmatdhanu@students.unnes.ac.id",
            batch: 2021,
            program_study: "Sistem Informasi",
            birtday: new Date("2003-06-18")
        },
        {
            identityNumber: "4611421112",
            name: "ARI FARHANSYACH DIRAJA",
            email: "arifarhansyachdiraja@students.unnes.ac.id",
            batch: 2021,
            program_study: "Teknik Informatika",
            birtday: new Date("2003-05-20")
        },
        {
            identityNumber: "4611421093",
            name: "MICHAEL JONATHAN PANJAITAN",
            email: "michaelpanjaitan13@students.unnes.ac.id",
            batch: 2021,
            program_study: "Teknik Informatika",
            birtday: new Date("2002-12-13")
        },
        {
            identityNumber: "4611421091",
            name: "ANGGITO WAHYU ADI",
            email: "itoadi2002@students.unnes.ac.id",
            batch: 2021,
            program_study: "Teknik Informatika",
            birtday: new Date("2002-04-03")
        },
        {
            identityNumber: "5302421061",
            name: "DIMAS SAKHA FAUZI",
            email: "zenox2511@students.unnes.ac.id",
            batch: 2021,
            program_study: "Pendidikan Teknik Informatika dan Komputer",
            birtday: new Date("2002-12-09")
        },
        {
            identityNumber: "4611421029",
            name: "KEVYN ALIFIAN HERNANDA WIBOWO",
            email: "kevinalifian2802@students.unnes.ac.id",
            batch: 2021,
            program_study: "Teknik Informatika",
            birtday: new Date("2003-02-28")
        },
        {
            identityNumber: "5312421023",
            name: "AZRUL HANIF DINOFA",
            email: "azrulretropus200@students.unnes.ac.id",
            batch: 2021,
            program_study: "Teknik Komputer",
            birtday: new Date("2002-11-28")
        },
        {
            identityNumber: "5301421052",
            name: "NURUL HADI MUSTOFA",
            email: "nurulhadimustofa@students.unnes.ac.id",
            batch: 2021,
            program_study: "Pendidikan Teknik Elektro",
            birtday: new Date("2002-04-24")
        },
        {
            identityNumber: "5312421019",
            name: "Erika Cindyana Mahesti",
            email: "kacin691@students.unnes.ac.id",
            batch: 2021,
            program_study: "Teknik Komputer",
            birtday: new Date("2001-01-18")
        },
        {
            identityNumber: "5312421003",
            name: "Arvina Rizqi Nurul'aini",
            email: "arvinarizqi@students.unnes.ac.id",
            batch: 2021,
            program_study: "Teknik Komputer",
            birtday: new Date("2002-07-09")
        }
    ]
    for (let items of prigel_user_seed) {
        let password = items.name.replace('Dr. ', '').replace(',', '').split(" ")[0]+"2023"
        console.log(items.name, items.identityNumber, password)
        data = {
            data:{
                name: items.name,
                identityNumber: items.identityNumber,
                password: await genPass.generatePassword(password),
                email: items.email,
                birtday: items.birtday ?? null,
                batch: items.batch,
                program_study: items.program_study,
                roleuser: {
                    create: {
                        role: {
                            connect: {
                                guardName: 'students',
                            }
                        }
                    }
                }
            }
        }
        await prisma.user.create(data)
    }
    const csvFilePath = 'nonprigel.csv';

// Membaca file CSV dan melakukan sesuatu dengan data
fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', async (row) => {
        let password = row.name.replace('Dr. ', '').replace(',', '').split(" ")[0]+"2023"
        data = {
            data:{
                name: row.name,
                identityNumber: row.identity,
                password: await genPass.generatePassword(password),
                email: row.email,
                birtday: new Date(row.birtday),
                batch: parseInt(row.batch),
                program_study: row.studyProgram,
                phoneNumber: row.phoneNumber,
                roleuser: {
                    create: {
                        role: {
                            connect: {
                                guardName: 'students',
                            }
                        }
                    }
                }
            }
        }
        await prisma.user.create(data)
    })
    .on('end', () => {
        console.log('Penambahan Dari CSV sudah selesai');
    });
}