const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient();
const fs = require('fs');
const csv = require('csv-parser');
exports.run = async () => {
    const user_groupsa = [
        {
            nim: "5312421026",
            project: ["SISTEM INTEGRATIF SMART CARD UNTUK PENGAMAN PINTU", "FACETRO", "SPARKA", "REMOSTO"]
        },
        {
            nim: "4612421017",
            project: ["LMS", "PRIGEL-BATCH 3"]
        },
        {
            nim: "4611421040",
            project: ["LMS", "PRIGEL-BATCH 3"]
        },
        {
            nim: "4611421013",
            project: ["LMS", "PRIGEL-BATCH 3"]
        },
        {
            nim: "4611421026",
            project: ["LMS", "PRIGEL-BATCH 3"]
        },
        {
            nim: "4611421104",
            project: ["MEDUNNES", "PRIGEL-BATCH 3"]
        },
        {
            nim: "4612421007",
            project: ["MEDUNNES", "PRIGEL-BATCH 3"]
        },
        {
            nim: "4611421112",
            project: ["REMOSTO", "PRIGEL-BATCH 3"]
        },
        {
            nim: "4611421093",
            project: ["REMOSTO", "PRIGEL-BATCH 3"]
        },
        {
            nim: "4611421091",
            project: ["FACETRO", "PRIGEL-BATCH 3"]
        },
        {
            nim: "5302421061",
            project: ["FACETRO", "PRIGEL-BATCH 3"]
        },
        {
            nim: "4611421029",
            project: ["SENTI", "PRIGEL-BATCH 3"]
        },
        {
            nim: "5312421023",
            project: ["SPARKA", "PRIGEL-BATCH 3", "Sistem Cerdas safety property management pada wearpack safety dalam keselamatan kerja"]
        },
        {
            nim: "5301421052",
            project: ["SPARKA", "PRIGEL-BATCH 3"]
        },
    ]
    user_groupsa.forEach(async (items) => {
        let data = {
            where: {
                identity_number: items.nim,
            },
            data: {
                user_group: {
                    create: items.project.map((projectItems) => {
                        console.log(projectItems)
                        return { group: { connect: { name: projectItems } } }
                    })
                },
            },
        }
        await prisma.user.update(data)
        return data
    });
    const csvFilePath = 'nonprigel.csv';

    // Membaca file CSV dan melakukan sesuatu dengan data
    const ss = await fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', async (row) => {
            let data = {
                where: {
                    identity_number: row.identity,
                },
                data: {
                    user_group: {
                        create: row.group.split('.').map((projectItems) => {
                            if(projectItems != ""){
                                return { group: { connect: { name: projectItems } } }
                            }
                        })
                    },
                },
            }
            try{
                console.log(`Name ${row.name} -> ${JSON.stringify(data.data.user_group.create)}`)
                await prisma.user.update(data)
            }catch(e){
                console.error(`Error User->Group (${row.name} -> ${JSON.stringify(data.data.user_group.create)})`)
            }
        })
}