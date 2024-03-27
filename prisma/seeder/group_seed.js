const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient();

exports.run = async () =>{
    const group_seed = [
        //Capstone
        {
            name: "SISTEM INTEGRATIF SMART CARD UNTUK PENGAMAN PINTU",
            device: "Ruang 1A",
            notify_to: "198409052019031006"
        },
        {
            name: "Sistem Smart Locker Menggunakan Teknologi NFC untuk Akses Kontrol dan Monitoring di Lingkungan Perpustakaan",
            device: "Presensi Gedung E6",
            notify_to: "199202282022031011"
        },
        {
            name: "PENGEMBANGAN INTELLIGENT ELECTROCARDIOGRAPH PORTABLE UNTUK PEMANTAUAN DETAK JANTUNG",
            device: "Presensi Gedung E6",
            notify_to: "198409052019031006"
        },
        {
            name: "Rancang Bangun Pengelolaan Kolam Ikan Jarak Jauh Berbasis IoT",
            device: "Presensi Gedung E11",
            notify_to: "198303072012121004"
        },
        {
            name: "Teknologi Smart Home Berbasis Suara untuk Kontrol Pencahayaan Ramah Disabilitas",
            device: "Presensi Gedung E11",
            notify_to: "197808222003121002"
        },
        {
            name: "Sistem Cerdas Sarung Tangan Anti Microsleep untuk Keselamatan Pengguna Jalan",
            device: "Presensi Gedung E11",
            notify_to: "197808222003121002"
        },
        {
            name: "Sistem monitoring kualitas udara berbasi IoT di lingkungan UNNES",
            device: "Presensi Gedung E6",
            notify_to: "196306281990021001"
        },
        {
            name: "Alat bantu monitor disabilitas",
            device: "Presensi Gedung E11",
            notify_to: "198409052019031006"
        },
        {
            name: "Penerapan solar tracking system menggunakan dual axis tracking secara real time dengan metode fuzzy logic dan random forest berbasis IoT",
            device: "Presensi Gedung E11",
            notify_to: "197808222003121002"
        },
        {
            name: "Penerapan Penyortiran Sampah Plastik Otomatis Berbasis Kecerdasan Buatan dengan ROS2 menggunakan SSD(Single Shot MultiBox Detector), YOLOv5, dan Faster R-CNN Lite",
            device: "Presensi Gedung E6",
            notify_to: "1993120720230812001"
        },
        {
            name: "Penerapan Pemberian makan dan pendeteksi usia hewan peliharaan otomatis menggunakan methode Fuzy logic dan YoloV5",
            device: "Presensi Gedung E6",
            notify_to: "198801072022031004"
        },
        {
            name: "PRIGEL-BATCH 3",
            device: "Ruang 1A",
            notify_to: "198409052019031006"
        },
        {
            name: "SPRAKA",
            device: "Ruang 1A",
            notify_to: "198409052019031006"
        },
        {
            name: "REMOSTO",
            device: "Ruang 1A",
            notify_to: "198409052019031006"
        },
        {
            name: "BIMBINGAN SKRIPSI",
            device: "Presensi Gedung E6",
            notify_to: "198409052019031006"
        }
    ]
}