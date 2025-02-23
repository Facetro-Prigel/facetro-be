const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const genPass = require('../../helper/generator');
const utils = require('../../helper/utils');
const fs = require('fs');
const csv = require('csv-parser');
exports.run = async () => {
    const user_seed = await prisma.user.create({
        data:
        {
            name: "Muhammad Iqbal",
            identity_number: "5312421026",
            password: await genPass.generatePassword("Leb4hG@nt3ng"),
            email: "xmod3905@students.unnes.ac.id",
            birthday: new Date("2003-05-01"),
            batch: 2021,
            program_study: "Teknik Komputer",
            telegram_token: "cZQJlk8Ap0",
            role_user: {
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

    await prisma.user.create({
        data:
        {
            name: "Dr. Anan Nugroho, S.T., M.Eng.",
            identity_number: "198409052019031006",
            password: await genPass.generatePassword("Anan2024"),
            email: "anannugroho@mail.unnes.ac.id",
            telegram_token: "zPDHDvvvwN",
            role_user: {
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
    const lecture_user_seed = [
        {
            identity_number: "197808222003121002",
            name: "Dr. Feddy Setio Pribadi, S.Pd., M.T.",
            email: "feddy.setio@mail.unnes.ac.id"
        },
        {
            name: "Febry Putra Rochim, S.T., M.Eng.",
            identity_number: "199202282022031011",
            email: "febry.putra@mail.unnes.ac.id"
        },
        {
            name: "Ahmad Fashiha Hastawan, S.T., M.Eng.",
            identity_number: "198802102018031001",
            email: "ahmad.fashiha@mail.unnes.ac.id"
        },
        {
            identity_number: "196306281990021001",
            name: "Dr. Djuniadi, M.T.",
            email: "djuniadi@mail.unnes.ac.id"
        },
        {
            identity_number: "198303072012121004",
            name: "Nur Iksan, S.T., M.Kom.",
            email: "nur.iksan@mail.unnes.ac.id"
        },
        {
            identity_number: "1993120720230812001",
            name: "Abdurrakhman Hamid Al-Azhari, S.T., M.T.",
            email: "abdurrakhmanhamid@mail.unnes.ac.id"
        },
        {
            identity_number: "198801072022031004",
            name: "Syahroni Hidayat, S.T., M.Eng.",
            email: "muh.iqbalg1@gmail.com"
        }
    ]
    for (let items of lecture_user_seed) {
        let password = items.name.replace('Dr. ', '').replace(',', '').split(" ")[0]+"2023"
        console.log(items.name, items.identity_number, password)
        data = {
            data:{
                name: items.name,
                identity_number: items.identity_number,
                password: await genPass.generatePassword(password),
                email: items.email,
                telegram_token: genPass.generateString(10),
                role_user: {
                    create: {
                        role: {
                            connect: {
                                guard_name: 'lecture',
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
            identity_number: "4612421017",
            name: "Luthfiyanto",
            email: "luthfiyantooo@students.unnes.ac.id",
            batch: 2021,
            program_study: "Sistem Informasi",
            birthday: new Date("2004-02-26")
        },
        {
            identity_number: "4611421040",
            name: "Robert Panca R. Simanjuntak",
            email: "simanjuntak101001@students.unnes.ac.id",
            batch: 2021,
            program_study: "Teknik Informatika",
            birthday: new Date("2001-10-10")
        },
        {
            identity_number: "4611421013",
            name: "Hilmi Syamsudin",
            email: "hilmisyamsudin@students.unnes.ac.id",
            batch: 2021,
            program_study: "Teknik Informatika",
            birthday: new Date("2003-03-19")
        },
        {
            identity_number: "4611421026",
            name: "Burhan Ahmad",
            email: "bur3112003@students.unnes.ac.id",
            batch: 2021,
            program_study: "Teknik Informatika",
            birthday: new Date("2003-01-31")
        },
        {
            identity_number: "4611421104",
            name: "Reyhan Herdiyanto",
            email: "reyhanherdiyanto180603@students.unnes.ac.id",
            batch: 2021,
            program_study: "Teknik Informatika",
            birthday: new Date("2003-06-18")
        },
        {
            identity_number: "4612421007",
            name: "Ikhsan Rahmatdhanu",
            email: "ikhsanrahmatdhanu@students.unnes.ac.id",
            batch: 2021,
            program_study: "Sistem Informasi",
            birthday: new Date("2003-06-18")
        },
        {
            identity_number: "4611421112",
            name: "Ari Farhansyach Diraja",
            email: "arifarhansyachdiraja@students.unnes.ac.id",
            batch: 2021,
            program_study: "Teknik Informatika",
            birthday: new Date("2003-05-20")
        },
        {
            identity_number: "4611421093",
            name: "Michael Jonathan Panjaitan",
            email: "michaelpanjaitan13@students.unnes.ac.id",
            batch: 2021,
            program_study: "Teknik Informatika",
            birthday: new Date("2002-12-13")
        },
        {
            identity_number: "4611421091",
            name: "Anggito Wahyu Adi",
            email: "itoadi2002@students.unnes.ac.id",
            batch: 2021,
            program_study: "Teknik Informatika",
            birthday: new Date("2002-04-03")
        },
        {
            identity_number: "5302421061",
            name: "Dimas Sakha Fauzi",
            email: "zenox2511@students.unnes.ac.id",
            batch: 2021,
            program_study: "Pendidikan Teknik Informatika dan Komputer",
            birthday: new Date("2002-12-09")
        },
        {
            identity_number: "4611421029",
            name: "Kevyn Alifian Hernanda Wibowo",
            email: "kevinalifian2802@students.unnes.ac.id",
            batch: 2021,
            program_study: "Teknik Informatika",
            birthday: new Date("2003-02-28")
        },
        {
            identity_number: "5312421023",
            name: "Azrul Hanif Dinofa",
            email: "azrulretropus200@students.unnes.ac.id",
            batch: 2021,
            program_study: "Teknik Komputer",
            birthday: new Date("2002-11-28")
        },
        {
            identity_number: "5301421052",
            name: "Nurul Hadi Mustofa",
            email: "nurulhadimustofa@students.unnes.ac.id",
            batch: 2021,
            program_study: "Pendidikan Teknik Elektro",
            birthday: new Date("2002-04-24")
        }
    ]
    for (let items of prigel_user_seed) {
        let password = items.name.replace('Dr. ', '').replace(',', '').split(" ")[0]+"2023"
        console.log(items.name, items.identity_number, password)
        data = {
            data:{
                name: items.name,
                identity_number: items.identity_number,
                password: await genPass.generatePassword(password),
                email: items.email,
                birthday: items.birthday ?? null,
                batch: items.batch,
                program_study: items.program_study,
                telegram_token: genPass.generateString(10),
                role_user: {
                    create: {
                        role: {
                            connect: {
                                guard_name: 'students',
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
                identity_number: row.identity,
                password: await genPass.generatePassword(password),
                email: row.email,
                birthday: new Date(row.birthday),
                batch: parseInt(row.batch),
                program_study: row.studyProgram,
                phone_umber: row.phoneNumber,
                telegram_token: genPass.generateString(10),
                role_user: {
                    create: {
                        role: {
                            connect: {
                                guard_name: 'students',
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