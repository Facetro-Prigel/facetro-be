const { PrismaClient } = require('@prisma/client')

const generator = require('../helper/generator')
const utils = require('../helper/utils')
const { bot } = require('../helper/telegram')
const axios = require('axios')
const role_utils = require('../helper/role_utils');
const { request } = require('express')
const device = require('./device')
const { verify } = require('jsonwebtoken')
const prisma = new PrismaClient()
const compareFace = async (base64image, dbSignature) => {
    let bbox = []
    let signiture = ""
    let isMatch = false
    let similarityResult, lengthOfTimeRequired
    let config_u = { headers: { "Content-Type": "application/json", } }
    await axios.post(`${process.env.ML_URL}match`, { image: base64image, signature: dbSignature }, config_u).then((res) => {
        let datas = res.data
        bbox = datas.bbox
        signiture = datas.signiture
        isMatch = datas.isMatch == "True" ? true : false
        similarityResult = datas.similarityResult
        lengthOfTimeRequired = datas.lengthOfTimeRequired
    }).catch((e) => {
        // console.log(`Request Error in ${file}`)
    })
    return { isMatch: isMatch, bbox: bbox, signature: signiture,  similarityResult: similarityResult, lengthOfTimeRequired: lengthOfTimeRequired}
}
const send2Telegram = async (isExist, ml_result, notify_to, requestImagePath, captionForElse, captionThatUser) => {
    if (ml_result.isMatch) {
        if (isExist.telegramId) {
            await bot.telegram.sendPhoto(isExist.telegramId, { source: "./" + requestImagePath }, { caption: captionThatUser })
        }
        for (let notify of notify_to) {
            if (notify) {
                await bot.telegram.sendPhoto(notify, { source: "./" + requestImagePath }, { caption: captionForElse })
            }
        }
    }
}
const pythonModulus = (a, b) => {
    return ((a % b) + b) % b;
}
const handelSend2Telegram = async (isExist, ml_result, notify_to, requestImagePath, captionForElse, captionThatUser, n = 1) => {
    try {
        await send2Telegram(isExist, ml_result, notify_to, requestImagePath, captionForElse, captionThatUser)
    } catch (e) {
        console.error(`Error Terjadi Ketika Mengirim Ke telegram! Percobaan ke-${n}`)
        if (n < 6) {
            n += 1
            setTimeout(async () => {
                await handelSend2Telegram(isExist, ml_result, notify_to, requestImagePath, captionForElse, captionThatUser, n)
            }, 3000);
        }
    }
}
module.exports = {
    log: async (req, res) => {
        const startTotalTimeNeeded = process.hrtime();
        let body = req.body
        let identity = String(body.identity)
        let image = body.image
        let logAnywhere = false;
        if ((Object.keys(body).length == 2) && (body.identity != undefined)) {
            requestImagePath = `photos/${generator.generateString(23)}.jpg`
            utils.saveImage(image, requestImagePath)
            identity = identity.replace(/[^A-F0-9]/g, '')
            isExist = await prisma.user.findFirst({
                where: {
                    "OR": [{ "identityNumber": identity }, { "nfc_data": identity }],
                },
                include: {
                    roleuser: {
                        include: {
                            role: true
                        }
                    },
                    usergroup: {
                        include: {
                            group: {
                                include: {
                                    users: true
                                }
                            }
                        }
                    }
                }
            })
            if (!isExist) {
                return res.status(404).json({ msg: "Identitas tersebut tidak terdaftar", code: 404 })
            }

            isCanPresenceAnyware = await prisma.user.findFirst({
                where: {
                    uuid: isExist["uuid"],
                    OR: [
                        {
                            roleuser: {
                                some: {
                                    role: {
                                        is: {
                                            guardName: 'super_admin'
                                        }
                                    }
                                }
                            }
                        }, {
                            permissionUser: {
                                some: {
                                    permission: {
                                        is: {
                                            guardName: "log_anywhere"
                                        }
                                    }
                                }
                            }
                        },
                        {
                            roleuser: {
                                some: {
                                    role: {
                                        is: {
                                            permisionrole: {
                                                some: {
                                                    permission: {
                                                        is: {
                                                            guardName: "log_anywhere"
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    ]
                },
                include: {
                    permissionUser: {
                        include: {
                            permission: true
                        }
                    },
                    roleuser: {
                        include: {
                            role: {
                                include: {
                                    permisionrole: {
                                        include: {
                                            permission: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            })
            let isDeviceOk = false
            let whereCluse = {}
            if (!isCanPresenceAnyware) {
                for (let i = 0; i < isExist.usergroup.length; i++) {
                    if (isExist.usergroup[i].group.devices == req.device.uuid) {
                        isDeviceOk = true
                        break
                    }
                }
                if (!isDeviceOk) {
                    return res.status(403).json({ msg: "Anda Tidak Dapat Presensi di sini", code: 403 })
                }
                whereCluse.deviceUuid = req.device.uuid
            }
            // combines data from User with the last 4 record logs 
            whereCluse.userUuid = isExist.uuid
            whereCluse.isMatch = true
            const four_last_signatures = await prisma.log.findMany({
                where: whereCluse,
                take: 4,
                orderBy: {
                    createdAt: 'desc',
                },
                select:{
                    imagePath: true,
                    bbox: true,
                    signature: true
                }
            })
            four_last_signatures.push({
                imagePath: isExist.avatar,
                bbox: isExist.bbox,
                signature: isExist.signature
            })
            // Check to ML (Face Recognations)
            let ml_result = {}
            let seleted_server_image = {}
            let condidateNumber = 0;
            const four_last_signatures_process = []
            for (let signature of four_last_signatures) {
                try {
                    ml_result = await compareFace(image, signature.signature)
                    seleted_server_image.candidateNumber = condidateNumber 
                    seleted_server_image.image = signature.imagePath
                    seleted_server_image.bbox = signature.bbox
                    seleted_server_image.signature = signature.signature
                    seleted_server_image.similarityResult = ml_result.similarityResult
                    seleted_server_image.lengthOfTimeRequired = ml_result.lengthOfTimeRequired
                    four_last_signatures_process.push(seleted_server_image)
                    if (ml_result.isMatch) {
                        break
                    }
                } catch (e) {
                    console.log(e)
                    return res.status(400).json({ msg: "Tidak atau terdapat banyak wajah!", code: 400 })
                }
                condidateNumber += 1
            }
            // Check is thare have log data
            const now = new Date()
            const gteValue = `${now.getFullYear()}-${generator.generateZero(now.getMonth() + 1)}-${generator.generateZero(now.getDate())}T00:00:00.000+07:00`
            whereCluse.type = "Login"
            whereCluse.createdAt = { gte: new Date(gteValue).toISOString() }
            let todayLog = await prisma.log.findFirst({
                where: whereCluse
            })
            // process create log data
            let logData = {
                userUuid: isExist.uuid,
                bbox: ml_result.bbox,
                imagePath: requestImagePath,
                deviceUuid: req.device.uuid,
                signature: ml_result.signature,
                isMatch: ml_result.isMatch,
                createdAt: now
            }
            logData.type = "Login"
            let result = {
                name: isExist.name,
                role: isExist.roleuser.map((i) => {
                    return i.role.name
                }),
                group: isExist.usergroup.map((i) => {
                    return i.group.name
                }),
                identity: isExist.identityNumber,
                device: req.device.name,
                isMatch: ml_result.isMatch,
                clientData: {
                    image: requestImagePath,
                    bbox: ml_result.bbox
                },
                serverData: {
                    image: seleted_server_image.image,
                    bbox: seleted_server_image.bbox
                }
            }
            let startTimeToHuman, endTimeToHuman, endCaptions, captionForElse
            result.startTime = now.toISOString()
            
            if (todayLog) {
                logData.type = "Logout"
                result.startTime = todayLog.createdAt.toISOString()
                result.endTime = now.toISOString()
                endTimeToHuman = utils.timeToHuman(result.endTime)
                let timeDiff = utils.countDiff(now.getTime() - todayLog.createdAt.getTime())
                endCaptions = ` pulang pada ${endTimeToHuman} selama ${timeDiff} di ${req.device.name}`
            }
            startTimeToHuman = utils.timeToHuman(result.startTime)
            // Other data
            const endTotalTimeNeeded = process.hrtime(startTotalTimeNeeded) 
            const totalTimeNeeded = (endTotalTimeNeeded[0] * 1000) + (endTotalTimeNeeded[1] / 1e6);
            logData.otherData = {
                'totalTimeNeeded': totalTimeNeeded,
                'dataComparisonCandidate': four_last_signatures,
                'dataComparisonCandidateAfterProcess': four_last_signatures_process,
            }
            await prisma.log.create({ data: logData })
            let captionThatUser = `Kamu Bertugas di ${req.device.name} presensi di ${req.device.name} berangkat pada ${startTimeToHuman}`
            captionThatUser += endCaptions ?? ''
            captionForElse = `${isExist.name} dari ${isExist.program_study} ${isExist.batch} dengan proyek:\n`
            captionForElse += utils.arrayToHuman(isExist.usergroup.map((t) => {
                return t.group.name
            })) + `\n presensi di ${req.device.name} berangkat pada ${startTimeToHuman}`
            captionForElse += endCaptions ?? ''
            // Send to Telegram!
            let super_admin_users = await role_utils.getUserWithRole('super_admin', 'telegramId')
            let admin_users = await role_utils.getUserWithRole('admin', 'telegramId')
            let notify_to_users = isExist.usergroup.map((t) => {
                return t.group.users.telegramId
            })
            let notify_to = []
            notify_to = notify_to.concat(super_admin_users, admin_users, notify_to_users)
            notify_to = new Set(notify_to)
            handelSend2Telegram(isExist, ml_result, notify_to, requestImagePath, captionForElse, captionThatUser)
            const io = req.app.get('socketio');
            if (ml_result.isMatch) {
                io.emit('logger update', {
                    name: isExist.name,
                    project: result.group,
                    device: req.device.name,
                    photo: requestImagePath,
                    bbox: ml_result.bbox,
                    time: result.startTime
                })
            }
            return res.status(202).json({ result })

        }
        res.status(400).json({ msg: "Request yang diminta salah", code: 400 })
    },
    getLog: async (req, res) => {
        let logDatas = await prisma.log.findMany({
            where: {
                isMatch: true
            },
            orderBy: [
                {
                    createdAt: 'desc'
                }
            ],
            select: {
                imagePath: true,
                bbox: true,
                user: {
                    select: {
                        name: true,
                        identityNumber: true,
                    }
                },
                createdAt: true,
                device: {
                    select: {
                        name: true,
                    }
                }
            }
        })
        let showLogs = [];
        for (const log of logDatas) {
            showLogs.push({
                name: log.user.name,
                nim: log.user.identityNumber,
                device: log.device.name,
                image: log.imagePath,
                bbox: log.bbox,
                inTime: log.createdAt
            })
        }
        return res.json(showLogs)
    },
    cardlessRequest: async (req, res) => {
        const n = 3191103090
        const numericUUID = utils.uuidToDecimal(req.user.uuid).slice(0, 20)
        const secret_key = BigInt(numericUUID) % BigInt(n);
        const public_key = (secret_key ** BigInt(2)) % BigInt(n);
        return res.json({ public_key: public_key.toString(), email: req.user.email })
    },
    cardlessVerify: async (req, res) => {
        const n = 3191103090
        const body = req.body
        const publicKey = body.public_key
        let secretKey = 2
        let numericUUID = 0
        // Generate random bits and calculate commitment
        const r = BigInt((Math.floor(Math.random() * 99e20) + 10e20)) % BigInt(n);
        const x = (r ** BigInt(2)) % BigInt(n);
        try {
            const user = await prisma.user.findUnique({where:{
                email: body.email
            },select:{
                name:true,
                uuid: true
            }})
            numericUUID = utils.uuidToDecimal(user.uuid).slice(0, 20)
        } catch (error) {
            return res.status(403).json({ msg: "Kradensisal tidak cocok!" })
        }
        secretKey = BigInt(numericUUID) % BigInt(n);

        // Send challenge
        const challenge = Math.floor(Math.random() * 2);

        // Respond with the private key
        const y = (r * (secretKey ** BigInt(challenge) % BigInt(n))) % BigInt(n);

        // Verify
        const expectedResponse = (x * (BigInt(publicKey) ** BigInt(challenge) % BigInt(n))) % BigInt(n);
        if ((y ** BigInt(2)) % BigInt(n) === expectedResponse) {
            return res.status(202).json({ msg: "Akses diizinkan!" })
        }
        return res.status(403).json({ msg: "Kradensisal tidak cocok!" })
    }
}