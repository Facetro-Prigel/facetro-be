const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient();
const fs = require('fs');
const csv = require('csv-parser');
exports.run = async () => {
    const user_groupsa = [
        {
            nim: "5312421026",
            project: ["FACETRO"]
        },
        {
            nim: "5312422008",
            project: ["PRIGEL-BATCH 5", "FACETRO"]
        },{
            nim: "5312422003",
            project: ["PRIGEL-BATCH 5", "FACETRO"]
        },{
            nim: "5312422046",
            project: ["FACETRO"]
        },{
            nim: "5312422028",
            project: ["PRIGEL-BATCH 5", "FACETRO"]
        },{
            nim: "5312422037",
            project: ["PRIGEL-BATCH 5", "FACETRO"]
        },{
            nim: "5312422017",
            project: ["PRIGEL-BATCH 5", "FACETRO"]
        },{
            nim: "5302422036",
            project: ["FACETRO"]
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
}