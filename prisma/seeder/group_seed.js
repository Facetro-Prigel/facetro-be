const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient();

exports.run = async () => {
    const group_seed = [
        {
            name: "PRIGEL-BATCH 5",
            device: "1A - Digital Center",
            notify_to: "198409052019031006"
        },
        {
            name: "FACETRO",
            device: "1A - Digital Center",
            notify_to: "198409052019031006"
        }
    ];
    for (let i of group_seed) {
        let data = {
            data: {
                name: i.name,
                locations: i.device,
                users: {
                    connect: {
                        identity_number: i.notify_to,
                    }
                }
            }
        }
        await prisma.group.create(data)
    }
}