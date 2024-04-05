const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient();

exports.run = async () => {
    const group_seed = [
        {
            name: "PRIGEL-BATCH 3",
            device: "1A - Digital Center",
            notify_to: "198409052019031006"
        },
        {
            name: "MEDUNNES",
            device: "1A - Digital Center",
            notify_to: "198409052019031006"
        },
        {
            name: "SPARKA",
            device: "1A - Digital Center",
            notify_to: "198409052019031006"
        },
        {
            name: "SENTI",
            device: "1A - Digital Center",
            notify_to: "198409052019031006"
        },
        {
            name: "FACETRO",
            device: "1A - Digital Center",
            notify_to: "198409052019031006"
        },
        {
            name: "REMOSTO",
            device: "1A - Digital Center",
            notify_to: "198409052019031006"
        },
        {
            name: "BIMBINGAN SKRIPSI",
            device: "E6-FT",
            notify_to: "198409052019031006"
        },
        {
            name: "LMS",
            device: "1A - Digital Center",
            notify_to: "198409052019031006"
        },
        //Capstone
        {
            name: "SISTEM INTEGRATIF SMART CARD UNTUK PENGAMAN PINTU",
            device: "1A - Digital Center",
            notify_to: "198409052019031006"
        },
        {
            name: "Sistem Smart Locker Menggunakan Teknologi NFC untuk Akses Kontrol dan Monitoring di Lingkungan Perpustakaan",
            device: "E6-FT",
            notify_to: "199202282022031011"
        },
        {
            name: "PENGEMBANGAN INTELLIGENT ELECTROCARDIOGRAPH PORTABLE UNTUK PEMANTAUAN DETAK JANTUNG",
            device: "E6-FT",
            notify_to: "198409052019031006"
        },
        {
            name: "Rancang Bangun Pengelolaan Kolam Ikan Jarak Jauh Berbasis IoT",
            device: "E11-FT",
            notify_to: "198303072012121004"
        },
        {
            name: "Sistem Cerdas safety property management pada wearpack safety dalam keselamatan kerja",
            device: "E11-FT",
            notify_to: "198802102018031001"
        },
        {
            name: "Teknologi Smart Home Berbasis Suara untuk Kontrol Pencahayaan Ramah Disabilitas",
            device: "E11-FT",
            notify_to: "197808222003121002"
        },
        {
            name: "Sistem Cerdas Sarung Tangan Anti Microsleep untuk Keselamatan Pengguna Jalan",
            device: "E11-FT",
            notify_to: "197808222003121002"
        },
        {
            name: "Sistem monitoring kualitas udara berbasi IoT di lingkungan UNNES",
            device: "E6-FT",
            notify_to: "196306281990021001"
        },
        {
            name: "Alat bantu monitor disabilitas",
            device: "E11-FT",
            notify_to: "198409052019031006"
        },
        {
            name: "Penerapan solar tracking system menggunakan dual axis tracking secara real time dengan metode fuzzy logic dan random forest berbasis IoT",
            device: "E11-FT",
            notify_to: "197808222003121002"
        },
        {
            name: "Penerapan Penyortiran Sampah Plastik Otomatis Berbasis Kecerdasan Buatan dengan ROS2 menggunakan SSD(Single Shot MultiBox Detector), YOLOv5, dan Faster R-CNN Lite",
            device: "E6-FT",
            notify_to: "1993120720230812001"
        },
        {
            name: "Penerapan Pemberian makan dan pendeteksi usia hewan peliharaan otomatis menggunakan methode Fuzy logic dan YoloV5",
            device: "E6-FT",
            notify_to: "198801072022031004"
        }
    ];
    for (let i of group_seed) {
        let data = {
            data: {
                name: i.name,
                locations: i.device,
                users: {
                    connect: {
                        identityNumber: i.notify_to,
                    }
                },
                device: {
                    connect: {
                        locations: i.device
                    }
                }
            }
        }
        await prisma.group.create(data)
    }
}