const fs = require('fs');
const path = require('path');
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
        const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
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
        if(!str){
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
    }
}