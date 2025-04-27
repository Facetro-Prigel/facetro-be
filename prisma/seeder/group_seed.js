const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient();

exports.run = async () => {
    const group_seed = [
        {
            name: "DEKANAT",
            device: "APEL DEKANAT",
            notify_to: "198409052019031006"
        },
        {
            name: "Akademik dan Kemahasiswaaan",
            device: "APEL DEKANAT",
            notify_to: "198409052019031006"
        },
        {
            name: "Keuangan dan Bisnis",
            device: "APEL DEKANAT",
            notify_to: "198409052019031006"
        },
        {
            name: "Umum, SDM dan Kerjasama",
            device: "APEL DEKANAT",
            notify_to: "198409052019031006"
        },
        {
            name: "KTP",
            device: "APEL DEKANAT",
            notify_to: "198409052019031006"
        },
        {
            name: "PNF",
            device: "APEL DEKANAT",
            notify_to: "198409052019031006"
        },
        {
            name: "BK",
            device: "APEL DEKANAT",
            notify_to: "198409052019031006"
        },
        {
            name: "PGSD",
            device: "APEL DEKANAT",
            notify_to: "198409052019031006"
        },
        {
            name: "Psikologi",
            device: "APEL DEKANAT",
            notify_to: "198409052019031006"
        },
        {
            name: "PGPAUD",
            device: "APEL DEKANAT",
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