const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const makeBufferFromBase64 = (base64String) => {
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    return buffer
}

const makeBondingBox = async (base64String, bbox, filename) => {
    // Membuat kotak merah dalam format SVG
    let savedFilename = './photos/temp/tele-img-' + filename
    const redBox = Buffer.from(
        `<svg width="${bbox[2]}" height="${bbox[2]}">
        <rect x="0" y="0" width="${bbox[2]}" height="${bbox[2]}" rx="${bbox[2] * 0.1}" ry="${bbox[2] * 0.1}" 
            fill="none" stroke="green" stroke-width="8"/>
      </svg> `
    );
    // Menggabungkan gambar latar dengan kotak merah dan menempelkan gambar PNG di atasnya
    let result = false
    try {
        sharp(makeBufferFromBase64(base64String))  // Gambar latar
            .composite([
                { input: redBox, top: bbox[1], left: bbox[0] }, // Menambahkan kotak di koordinat (50,50)
                { input: 'logo-unnes-horizontal.png', top: 25, left: 25 } // Menempelkan PNG di koordinat (150,150)
            ])
            .toFile(savedFilename, (err, info) => {
                if (err) {
                    return false
                } else {
                    return savedFilename
                }
            });
        result = savedFilename
    } catch (error) {
        console.error(error)
    }
    return result
}
module.exports = {
    arrayToHuman: (arrayData) => {
        if (Array.isArray(arrayData)) {
            if (arrayData.length == 0) {
                return "(Tidak Ada)"
            }
            if (arrayData.length == 1) {
                return arrayData[0]
            }
            const newArray = arrayData.slice(0, -1)
            return newArray.join(', ') + ", dan " + arrayData[arrayData.length - 1]
        }
        return arrayData ?? "(Tidak Ada)"
    },
    base64ToFile: (base64String) => {
        const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        return buffer
    },

    saveImage: (base64String, filePath) => {
        const buffer = makeBufferFromBase64(base64String);
        fs.writeFile(filePath, buffer, (err) => {
            if (err) {
                console.error('Gagal menyimpan gambar:', err);
            } else {
                console.log('Gambar berhasil disimpan:', filePath);
            }
        });
    },
    fileToBase64: (filePath) => {
        return new Promise((resolve, reject) => {
            fs.readFile(filePath, (error, data) => {
                if (error) {
                    reject(error);
                } else {
                    // Ubah data file menjadi base64
                    const base64Data = Buffer.from(data).toString('base64');
                    resolve(base64Data);
                }
            });
        });
    },
    copyAndRenameImage: (sourcePath, destinationPath, newName) => {
        // Membaca file gambar dari sumber
        fs.readFile(sourcePath, (err, data) => {
            if (err) {
                console.error('Gagal membaca file gambar:', err);
                return;
            }

            // Menyalin file ke destinasi
            fs.writeFile(path.join(destinationPath, newName), data, (err) => {
                if (err) {
                    console.error('Gagal menyalin dan mengubah nama gambar:', err);
                    return;
                }
                console.log('File berhasil disalin dan nama diubah.');
            });
        });
    },
    timeToHuman: (time) => {
        let s = new Date(time).toLocaleString('id-ID', {
            timeZone: 'Asia/Jakarta',
            timeStyle: "long",
            dateStyle: "full"
        })
        return s
    },
    countDiff: (deltaTime) => {
        var seconds = Math.floor(deltaTime / 1000);
        var minutes = Math.floor(seconds / 60);
        var hours = Math.floor(minutes / 60);
        seconds %= 60;
        minutes %= 60;
        return hours + " jam " + minutes + " menit " + seconds + " detik"
    },
    toSnakeCase: (str) => {
        if (!str) {
            return null
        }
        let cleanedStr = str.replace(/[^a-zA-Z0-9_\s]/g, '');

        let snakeCaseStr = cleanedStr
            .replace(/\s+/g, '_')
            .replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        if (snakeCaseStr.startsWith('_')) {
            snakeCaseStr = snakeCaseStr.substring(1);
        }

        return snakeCaseStr.toLowerCase();
    },
    uuidToDecimal: (uuid) => {
        let cleanUuidStr = uuid.replace(/-/g, '');
        let decimalValue = BigInt('0x' + cleanUuidStr);

        return decimalValue.toString();
    },
    webSockerUpdate: (req) => {
        const generat = require('./generator.js')
        const io = req.app.get('socketio');
        io.emit('update CUD', {
            token: generat.generateString(8)
        })
    },
    makeBufferFromBase64, makeBondingBox
}