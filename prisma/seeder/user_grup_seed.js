const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient();
exports.run = async () =>{
    const user_group=[
        {
            nim: "4612421017",
            project:["LMS","PRIGEL-BATCH 3"]
        },
        {
            nim: "4611421040",
            project:["LMS","PRIGEL-BATCH 3"]
        },
        {
            nim: "4611421013",
            project:["LMS","PRIGEL-BATCH 3"]
        },
        {
            nim: "4611421026",
            project:["LMS","PRIGEL-BATCH 3"]
        },
        {
            nim: "4611421104",
            project:["MEDUNNES","PRIGEL-BATCH 3"]
        },
        {
            nim: "4612421007",
            project:["MEDUNNES","PRIGEL-BATCH 3"]
        },
        {
            nim: "4611421112",
            project:["REMOSTO","PRIGEL-BATCH 3"]
        },
        {
            nim: "4611421093",
            project:["REMOSTO","PRIGEL-BATCH 3"]
        },
        {
            nim: "4611421091",
            project:["FACETRO","PRIGEL-BATCH 3"]
        },
        {
            nim: "5302421061",
            project:["FACETRO","PRIGEL-BATCH 3"]
        },
        {
            nim: "4611421029",
            project:["SENTI","PRIGEL-BATCH 3"]
        }, 
        {
            nim: "5312421023",
            project:["SPARKA", "PRIGEL-BATCH 3", "Sistem Cerdas safety property management pada wearpack safety dalam keselamatan kerja"]
        },
        {
            nim: "5301421052",
            project:["SPARKA","PRIGEL-BATCH 3"]
        },
    ]
    user_group.map(async (items) => {
        data = {
            where: {
                identityNumber: items.nim,
              },
              data: {
                usergroup:{
                    create: items.project.map((projectItems) => {
                        console.log(projectItems)
                        return {group: {connect: {name: projectItems}}}
                    })
                },
              },
        }
        await prisma.user.update(data)
        return data
    });
}