const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const minio_client = require('../minioClient');

require('dotenv').config();

const timeToHuman = (time) => {
    let s = new Date(time).toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        timeStyle: "long",
        dateStyle: "full"
    })
    return s
}
const createResponse = (res, status, title, detail, instance, data=undefined) => {
    res.title = title;
    res.detail = detail;
    res.instance = instance;
    res.container_id = process.env.CONTAINER_ID;
    res.timestamp = new Date().toISOString();
    res.status(status).json(data);
};

const makeBufferFromBase64 = (base64String) => {
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    return buffer
}

const makeBondingBox = async (base64String, bbox, filename) => {
    let savedFilename = 'photos/temp/tele-img-' + filename
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
            process.env.MINIO_BUCKET_NAME,
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

const MakeBirthdayCard = async (imagePath, date, name, bbox) => {
    if (name.length > 14) {
        name = transformSentence(name)
    }
    
    const thisYear= new Date().getFullYear();
    const dateObj = new Date(date)
    
    const age = thisYear - dateObj.getFullYear()
    
    const dateValue = dateObj.toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: "long"
      })

    const datePlaceholder = Buffer.from(`<svg width="277" height="1739" xmlns="http://www.w3.org/2000/svg"> <style> text { font-family: 'Bebas Neue'; font-size: 275px; fill: black; } </style> <text x="280" y="190" text-anchor="end" dominant-baseline="middle" transform="rotate(-90, 150, 150)"> ${dateValue} </text> </svg> `);
    const namePlaceHolder = Buffer.from(`<svg width="2156" height="386" xmlns="http://www.w3.org/2000/svg"> <style> text { font-family: 'Bebas Neue'; font-size: 275px; fill: white; } </style> <text x="1078" y="275" text-anchor="middle" dominant-baseline="middle"> ${name} </text> </svg> `);
    const agePlaceHolder = Buffer.from(`<svg width="2156" height="300" xmlns="http://www.w3.org/2000/svg"> <style> text { font-family: 'Bebas Neue'; font-size: 250px; fill: orange; } </style> <text x="1078" y="175" text-anchor="middle" dominant-baseline="middle">ke-${age}</text> </svg> `);
    let result = false
    const factor = 835 / bbox[2]
    try {
        // Get Image Meta
        const image_meta = await sharp(imagePath)
            .metadata()
            .then((metadata) => {
                return metadata
            })
            .catch((err) => {
                console.error('Error reading image:', err);
            });
        const bboxNew = [parseInt(bbox[0] * factor), parseInt(bbox[1] * factor)]
        // Image Resize
        const imageResize = await sharp(imagePath)
            .resize(parseInt(image_meta.width * factor), parseInt(image_meta.height * factor))
            .toBuffer()
            .then((data) => {
                return data
            })
            .catch((err) => {
                console.error('Error during image processing:', err);
                res.status(500).send('Error processing image');
            });
        // Image Masking
        const imageCroped = await sharp({
            create: {
                width: 3001,
                height: 4001,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            }
        }).composite([
            { input: imageResize, top: 634 - bboxNew[1], left: 1080 - bboxNew[0] },
            { input: 'birthday_template/mask.png', blend: 'dest-in' }
        ]).png().toBuffer().then((data) => {
            return data
        })

        // Image Composit
        const finalImage = await sharp('birthday_template/bg.jpg')  // Gambar latar
            .composite([
                { input: agePlaceHolder, top: 3200, left: 416 },
                { input: namePlaceHolder, top: 3393, left: 416 },
                { input: imageCroped, top: 0, left: 0 },
                { input: datePlaceholder, top: 774, left: 2556 },
            ]).toBuffer().then((data) => {
                return data
            })
        result = finalImage
    } catch (error) {
        console.error(error)
    }
    return result
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

    saveImage: async (base64String, filePath, bucketName = process.env.MINIO_BUCKET_NAME) => {
        const buffer = makeBufferFromBase64(base64String);
        try {
            await minio_client.putObject(bucketName, filePath, buffer, buffer.length);
            console.log(`Gambar berhasil disimpan di minio dengan path: ${filePath}`);
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
    makeBufferFromBase64, makeBondingBox, MakeBirthdayCard, createResponse, timeToHuman
}
