const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const genPass = require('../../helper/generator')
exports.run = async () => {
    const user_seed = await prisma.user.create({
        data:
        {
            name: "Muhammad Iqbal",
            identityNumber: "5312421026",
            password: await genPass.generatePassword("Leb4hG@nt3ng"),
            email: "xmod3905@students.unnes.ac.id",
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
            program_study: "Sistem Informasi"
        },
        {
            identityNumber: "4611421040",
            name: "ROBERT PANCA R. SIMANJUNTAK",
            email: "simanjuntak101001@students.unnes.ac.id",
            batch: 2021,
            program_study: "Teknik Informatika"
        },
        {
            identityNumber: "4611421013",
            name: "HILMI SYAMSUDIN",
            email: "hilmisyamsudin@students.unnes.ac.id",
            batch: 2021,
            program_study: "Teknik Informatika"
        },
        {
            identityNumber: "4611421026",
            name: "BURHAN AHMAD",
            email: "bur3112003@students.unnes.ac.id",
            batch: 2021,
            program_study: "Teknik Informatika"
        },
        {
            identityNumber: "4611421104",
            name: "REYHAN HERDIYANTO",
            email: "reyhanherdiyanto180603@students.unnes.ac.id",
            batch: 2021,
            program_study: "Teknik Informatika"
        },
        {
            identityNumber: "4612421007",
            name: "IKHSAN RAHMATDHANU",
            email: "ikhsanrahmatdhanu@students.unnes.ac.id",
            batch: 2021,
            program_study: "Sistem Informasi"
        },
        {
            identityNumber: "4611421112",
            name: "ARI FARHANSYACH DIRAJA",
            email: "arifarhansyachdiraja@students.unnes.ac.id",
            batch: 2021,
            program_study: "Teknik Informatika"
        },
        {
            identityNumber: "4611421093",
            name: "MICHAEL JONATHAN PANJAITAN",
            email: "michaelpanjaitan13@students.unnes.ac.id",
            batch: 2021,
            program_study: "Teknik Informatika"
        },
        {
            identityNumber: "4611421091",
            name: "ANGGITO WAHYU ADI",
            email: "itoadi2002@students.unnes.ac.id",
            batch: 2021,
            program_study: "Teknik Informatika"
        },
        {
            identityNumber: "5302421061",
            name: "DIMAS SAKHA FAUZI",
            email: "zenox2511@students.unnes.ac.id",
            batch: 2021,
            program_study: "Pendidikan Teknik Informatika dan Komputer"
        },
        {
            identityNumber: "4611421029",
            name: "KEVYN ALIFIAN HERNANDA WIBOWO",
            email: "kevinalifian2802@students.unnes.ac.id",
            batch: 2021,
            program_study: "Teknik Informatika"
        },
        {
            identityNumber: "5312421023",
            name: "AZRUL HANIF DINOFA",
            email: "azrulretropus200@students.unnes.ac.id",
            batch: 2021,
            program_study: "Teknik Komputer"
        },
        {
            identityNumber: "5301421052",
            name: "NURUL HADI MUSTOFA",
            email: "nurulhadimustofa@students.unnes.ac.id",
            batch: 2021,
            program_study: "Pendidikan Teknik Elektro"
        },
        {
            identityNumber: "5312421019",
            name: "Erika Cindyana Mahesti",
            email: "kacin691@students.unnes.ac.id",
            batch: 2021,
            programStudy: "Teknik Komputer",
        },
        {
            identityNumber: "5312421003",
            name: "Arvina Rizqi Nurul'aini",
            email: "arvinarizqi@students.unnes.ac.id",
            batch: 2021,
            programStudy: "Teknik Komputer",
        },
        {
            identityNumber: "5312421031",
            name: "Rafik Kladius",
            email: "rafikcladius69@students.unnes.ac.id",
            batch: 2021,
            programStudy: "Teknik Komputer",
        },
        {
            identityNumber: "5312421009",
            name: "Irfan Alfian Rizqi ",
            email: "irfanalfianrizqi@students.unnes.ac.id",
            batch: 2021,
            programStudy: "Teknik Komputer",
        },
        {
            identityNumber: "5312421030",
            name: "Niko Andriano",
            email: "nikoandriano230503@students.unnes.ac.id",
            batch: 2021,
            programStudy: "Teknik Komputer",
        },
        {
            identityNumber: "5312421018",
            name: "Yohanes Batara Setya",
            email: "yohanesbatarasetya@students.unnes.ac.id",
            batch: 2021,
            programStudy: "Teknik Komputer",
        },
        {
            identityNumber: "5312421025",
            name: "Alif Krisnanda Nurhuda Rahardian",
            email: "alifkrisnanda023@students.unnes.ac.id",
            batch: 2021,
            programStudy: "Teknik Komputer",
        },
        {
            identityNumber: "5311419035",
            name: "Mochammad Wildan Mochollad",
            email: "wildan1422m@students.unnes.ac.id",
            batch: 2019,
            programStudy: "Teknik Elektro",
        },
        {
            identityNumber: "5302420041",
            name: "Zidan Vieri Wijaya",
            email: "zidanvieri@students.unnes.ac.id",
            batch: 2020,
            programStudy: "Pendidikan Teknik Informatika dan Komputer",
        },
        {
            identityNumber: "5312421017",
            name: "Alena Ghinna Kirana",
            email: "alenaghinn13@students.unnes.ac.id",
            batch: 2021,
            programStudy: "Teknik Komputer",
        },
        {
            identityNumber: "5312421020",
            name: "Ryandi Kresna Anugerah",
            email: "ryandikresna@students.unnes.ac.id",
            batch: 2021,
            programStudy: "Teknik Komputer",
        },
        {
            identityNumber: "5312421008",
            name: "Mohammad Alvin Fajri",
            email: "alvinfajri200@students.unnes.ac.id",
            batch: 2021,
            programStudy: "Teknik Komputer",
        },
        {
            identityNumber: "5302418037",
            name: "Anang Ma'ruf",
            email: "mgnana@students.unnes.ac.id",
            batch: 2018,
            programStudy: "Pendidikan Teknik Informatika dan Komputer",
        },
        {
            identityNumber: "5302420049",
            name: "RIZKI ABDILLAH",
            email: "rizkiabd@students.unnes.ac.id",
            batch: 2020,
            programStudy: "Pendidikan Teknik Informatika dan Komputer",
        },
        {
            identityNumber: "5302418024",
            name: "IZZATUL JANNAH",
            email: "izzatuljnh@students.unnes.ac.id",
            batch: 2018,
            programStudy: "Pendidikan Teknik Informatika dan Komputer",
        },
        {
            identityNumber: "5312421016",
            name: "Septian Akbar Noor Wahyu Hardi",
            email: "septianakbarr92@students.unnes.ac.id",
            batch: 2021,
            programStudy: "Teknik Komputer",
        },
        {
            identityNumber: "5312421024",
            name: "Muhammad Hilmy Herdiansyah",
            email: "hilmyherdiansyah@students.unnes.ac.id",
            batch: 2021,
            programStudy: "Teknik Komputer",
        },
        {
            identityNumber: "5312421032",
            name: "Muhammad Pahlevi Adinugraha ",
            email: "pahleviadinugraha2@students.unnes.ac.id",
            batch: 2021,
            programStudy: "Teknik Komputer",
        },
        {
            identityNumber: "5311420038",
            name: "Hanna Naili Syifa",
            email: "hannasyifa06@students.unnes.ac.id",
            batch: 2020,
            programStudy: "Teknik Elektro",
        },
        {
            identityNumber: "5312421002",
            name: "Arya Isva Ramdhan Pratama",
            email: "aryaramdhan27@students.unnes.ac.id",
            batch: 2021,
            programStudy: "Teknik Komputer",
        },
        {
            identityNumber: "5312421010",
            name: "Widiyanto",
            email: "instinctjago41@students.unnes.ac.id",
            batch: 2021,
            programStudy: "Teknik Komputer",
        },
        {
            identityNumber: "5312421022",
            name: "Ninda Yulia Dwi Rahmawati",
            email: "nindayulia@students.unnes.ac.id",
            batch: 2021,
            programStudy: "Teknik Komputer",
        },
        {
            identityNumber: "5311420062",
            name: "Juan Aditya",
            email: "juanaditya75@students.unnes.ac.id",
            batch: 2020,
            programStudy: "Teknik Elektro",
        },
        {
            identityNumber: "5301420022",
            name: "Rizal Rezianto",
            email: "rizalrezianto14@students.unnes.ac.id",
            batch: 2020,
            programStudy: "Pendidikan Teknik Elektro",
        },
        {
            identityNumber: "5312421029",
            name: "Mohammad Maulana Maghribi ",
            email: "aulanamaghribi@students.unnes.ac.id",
            batch: 2021,
            programStudy: "Teknik Komputer",
        },
        {
            identityNumber: "5302420016",
            name: "Tia Rosalita",
            email: "tiarosalita06@students.unnes.ac.id",
            batch: 2020,
            programStudy: "Pendidikan Teknik Informatika dan Komputer",
        },
        {
            identityNumber: "5311420058",
            name: "Ridho Bagus Nugroho",
            email: "ridhobagusn21@students.unnes.ac.id",
            batch: 2020,
            programStudy: "Teknik Elektro",
        },
        {
            identityNumber: "5312421015",
            name: "Valdi Dhani Pratama",
            email: "Dhanivaldi0223@students.unnes.ac.id",
            batch: 2021,
            programStudy: "Teknik Komputer",
        },
        {
            identityNumber: "5312421004",
            name: "Syaiful Malik Yusuf Abdullah",
            email: "syaifilabdullah31@students.unnes.ac.id",
            batch: 2021,
            programStudy: "Teknik Komputer",
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
}