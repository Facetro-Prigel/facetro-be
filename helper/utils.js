const fs = require('fs');
const path = require('path');
module.exports = {
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
    copyAndRenameImage: (sourcePath, destinationPath, newName) =>{
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
    }
    
}