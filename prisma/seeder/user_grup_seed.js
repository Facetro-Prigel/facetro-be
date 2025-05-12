const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient();
const fs = require('fs');
const csv = require('csv-parser');
exports.run = async () => {
    const user_groupsa = [
        {
            nim: "5312421026",
            project: ["DEKANAT"]
        }
    ]
    user_groupsa.forEach(async (items) => {
        let data = {
            where: {
                identity_number: items.nim,
            },
            data: {
                user_group: {
                    create: items.project.map((projectItems) => {
                        return { group: { connect: { name: projectItems } } }
                    })
                },
            },
        }
        await prisma.user.update(data)
        return data
    });
}