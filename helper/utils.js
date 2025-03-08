const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const minio_client = require('../minioClient');

require('dotenv').config();

const replaceText = (text, replacements) => {
    Object.keys(replacements).forEach((key) => {
        text = text.replace(new RegExp(`\\$${key}`, 'g'), replacements[key]);
    });
    return text;
};
const createResponse = (res, status, title, detail, instance, data = undefined) => {
    let responseData = {}; 
    responseData.title = title;
    responseData.detail = detail;
    responseData.instance = instance;
    responseData.container_id = process.env.CONTAINER_ID;
    responseData.timestamp = new Date().toISOString();
    if (data) {
        responseData.data = Array.isArray(data) ? data : [data];
    }
    res.status(status).json(responseData);
};

const makeBufferFromBase64 = (base64String) => {
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    return buffer
}

const makeBondingBox = async (base64String, bbox, filename) => {
    let savedFilename = 'tele-img-' + filename
    const redBox = Buffer.from(
        `<svg width="${bbox[2]}" height="${bbox[2]}">
        <rect x="0" y="0" width="${bbox[2]}" height="${bbox[2]}" rx="${bbox[2] * 0.1}" ry="${bbox[2] * 0.1}" 
            fill="none" stroke="green" stroke-width="8"/>
      </svg> `
    );
    try {
        const imageBuffer = await sharp(makeBufferFromBase64(base64String))
            .composite([
                { input: redBox, top: bbox[1], left: bbox[0] },
                { input: 'logo-unnes-horizontal.png', top: 25, left: 25 }
            ])
            .jpeg()
            .toBuffer()
        //	.toFile(savedFilename, (err, info)=> {
        //		if(e){
        //			return false;
        //		}
        //		else{
        //			return savedFilename;
        //		}
        //	});
        //	result = savedFilename;
        //	return result;

        await minio_client.putObject(
            'log',
            savedFilename,
            imageBuffer,
            imageBuffer.length,
            { 'Content-Type': 'image/jpeg' }
        );
        return savedFilename;
    } catch (error) {
        console.error(error)
        return false;
    }
}
const transformSentence = (sentence) => {
    const academicTitlesRegex = /\b(?:S\.?T\.?|M\.?Sc\.?|Ph\.?D\.?|Dr\.?|Ir\.?|M\.?A\.?|B\.?S\.?|B\.?A\.?|MBA|M\.?D\.)\b/g;
    const academicTitlesRegexSub = /\b(([\w]+[.][\w]+)([.][\w])*)/g;
    const cleanedString = sentence.replace(academicTitlesRegex, '').replace(academicTitlesRegexSub, '').trim().replace('  ', '').replaceAll('.', '').replaceAll(',', '').trim();
    console.info(cleanedString)
    const words = cleanedString.split(" ");
    const transformedWords = words.map((word, index) => {
        if (index === 0 || index === 1) {
            return word;
        } else {
            return word[0].toUpperCase() + ".";
        }
    });
    const transformedSentence = transformedWords.join(" ");
    return transformedSentence;
}

const makeDesign = (designName, fgImg, fgBBOX, overlayData = {}) => {
    return new Promise(async (resolve, reject) => {
        const fsp = fs.promises;
        try {
            const directoryPath = path.join(__dirname, '../design_template', designName);
            const configPath = path.join(directoryPath, 'config.json');
            const bgPath = path.join(directoryPath, 'bg.jpg');
            const maskPath = path.join(directoryPath, 'mask.png');
            // Periksa keberadaan file
            await fsp.access(configPath, fsp.constants.F_OK).catch(() => {
                throw new Error(`Config file not found: ${configPath}`);
            });
            await fsp.access(bgPath, fsp.constants.F_OK).catch(() => {
                throw new Error(`Background image not found: ${bgPath}`);
            });
            // Baca config dan metadata gambar
            let configData = await fsp.readFile(configPath, 'utf8');
            configData = JSON.parse(configData);
            const facePlacement = configData.facePlacement;
            const overlay = configData.overlay || [];
            const factor = facePlacement.length / fgBBOX[2];

            const fgMetadata = await sharp(fgImg).metadata();
            const bgMeta = await sharp(bgPath).metadata();

            // Resize foreground image
            const imageResize = await sharp(fgImg)
                .resize(parseInt(fgMetadata.width * factor), parseInt(fgMetadata.height * factor))
                .toBuffer();

            const newBBOX = [parseInt(fgBBOX[0] * factor), parseInt(fgBBOX[1] * factor)];
            let imageComposite = [
                { input: imageResize, top: facePlacement.top - newBBOX[1], left: facePlacement.left - newBBOX[0] },
            ];

            // Tambahkan mask jika ada
            try {
                await fsp.access(maskPath, fsp.constants.F_OK);
                imageComposite.push({ input: maskPath, blend: 'dest-in' });
            } catch (err) {
                console.info('Design ini tidak di-mask-ing!');
            }

            // Buat gambar komposit mask
            const imageCroped = await sharp({
                create: {
                    width: bgMeta.width,
                    height: bgMeta.height,
                    channels: 4,
                    background: { r: 0, g: 0, b: 0, alpha: 0 },
                },
            })
                .composite(imageComposite)
                .png()
                .toBuffer();

            // Overlay tambahan
            const compositeOverlay = [{ input: imageCroped, top: 0, left: 0 }];
            if (Array.isArray(overlay)) {
                overlay.forEach((element) => {
                    const pos = element.position;
                    compositeOverlay.push({
                        input: Buffer.from(replaceText(element.input, overlayData), 'utf8'),
                        top: pos.top,
                        left: pos.left,
                    });
                });
            } else {
                console.warn('Overlay is not an array or is undefined.');
            }
            // Gabungkan semua layer dan kembalikan buffer
            const finalImageBuffer = await sharp(bgPath)
                .composite(compositeOverlay)
                .jpeg()
                .toBuffer();

            resolve(finalImageBuffer);
        } catch (err) {
            reject(err);
        }
    });
};

const calculateAge = (birthday) => {
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
  
    // Jika belum ulang tahun tahun ini, kurangi umur dengan 1
    if (
      monthDifference < 0 ||
      (monthDifference === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
  
    return age;
  }

module.exports = {
    verifyImage: async (base64String) => {
        if (!base64String.startsWith('data:image/jpeg;base64,')) {
            return false
        }
        const imageBuffer = Buffer.from(base64String.split(',')[1], 'base64');
        const metadata = await sharp(imageBuffer).metadata();
        
        if (metadata.width !== 160 || metadata.height !== 160) {
            return false
        }
        return true
    },
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

    saveImage: async (file, filePath, bucketName = process.env.MINIO_BUCKET_NAME) => {
        let buffer;
        if(Buffer.isBuffer(file)){
            buffer = file
        }else{
            buffer = makeBufferFromBase64(file);
        }
        try {
            await minio_client.putObject(bucketName, filePath, buffer, buffer.length);
            console.log(`Gambar berhasil disimpan di minio (${bucketName}) dengan path: ${filePath}`);
        } catch (e) {
            console.error(`Gagal menyimpan gambar ke minio: ${e} (${bucketName})`)
            console.table(minio_client)
        }
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
    makeBufferFromBase64, makeBondingBox, makeDesign, createResponse, calculateAge
}
