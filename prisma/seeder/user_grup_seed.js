const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt');;
const prisma = new PrismaClient();

const generatePassword = async (password) => {
    const salt = await bcrypt.genSalt(14);
    return await bcrypt.hash(password, salt);
}
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
            project:["SPARKA","PRIGEL-BATCH 3", "Sistem Cerdas safety property management pada wearpack safety dalam keselamatan kerja"]
        },
        {
            nim: "5301421052",
            project:["SPARKA","PRIGEL-BATCH 3", "Sistem Cerdas safety property management pada wearpack safety dalam keselamatan kerja"]
        },
    ]
}