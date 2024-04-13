const { PrismaClient } = require('@prisma/client')
const generator = require('../helper/generator')
const utils = require('../helper/utils')
const axios = require('axios')
const { request } = require('express')
const prisma = new PrismaClient()
const compareFace = async (base64image, dbSignature) =>{
    let bbox = []
    let signiture = ""
    let isMatch = false
    let config_u = { headers: { "Content-Type": "application/json", } }
    await axios.post(`${process.env.ML_URL}match`,{image: base64image, signature: dbSignature}, config_u).then((res)=>{
        let datas = res.data
        bbox= datas.bbox
        signiture = datas.signiture
        isMatch = datas.isMatch == "True" ? true : false
    }).catch((e)=>{
        console.log(`Request Error in ${file}`)
    })
    return {isMatch:isMatch, bbox:bbox, signature: signiture}
}
module.exports = {
    log: async (req, res) => {
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
                    usergroup:{
                        include:{
                            group:true
                        }
                    }
                }
            })
            if (!isExist) {
                return res.status(404).json({msg:"Identitas tersebut tidak terdaftar", code:404})
            }

            isCanPresenceAnyware = await prisma.user.findFirst({
                where: {
                    uuid: isExist["uuid"],
                    OR: [{
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
                        roleuser:{
                            some:{
                                role:{
                                    is:{
                                        permisionrole:{
                                            some:{
                                                permission:{
                                                    is:{
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
                    roleuser:{
                        include:{
                            role:{
                                include:{
                                    permisionrole:{
                                        include:{
                                            permission:true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            })
            if ((isExist["roleuser"][0]["role"]["guardName"] == "super_admin") || isCanPresenceAnyware) {
                logAnywhere = true
                console.log("super_admin")
            }
            let isDeviceOk = false
            let whereCluse = {}
            if (!logAnywhere){  
                for (let i = 0; i < isExist.usergroup.length; i++) {
                    if(isExist.usergroup[i].group.devices == req.device.uuid){
                        isDeviceOk = true
                        break
                    }
                } 
                if(!isDeviceOk){
                    return res.status(403).json({msg:"Anda Tidak Dapat Presensi di sini", code:403})
                }   
                whereCluse.deviceUuid = req.device.uuid
            }
            // combines data from User with the last 4 record logs 
            whereCluse.userUuid = isExist.uuid
            whereCluse.isMatch = true
            const four_last_signatures = await prisma.log.findMany({
                where:whereCluse,
                take:4,
                orderBy: {
                    createdAt: 'desc',
                }
            })
            four_last_signatures.push({
                imagePath: isExist.avatar,
                bbox: isExist.bbox,
                signature:isExist.signature
            })
            // Check to ML (Face Recognations)
            let ml_result = {}
            let seleted_server_image = {}
            for (let signature of four_last_signatures) {
                try{
                    ml_result = await compareFace(image, signature.signature)
                    seleted_server_image.image = signature.imagePath
                    seleted_server_image.bbox = signature.bbox
                    if(ml_result.isMatch){
                        break
                    }
                }catch(e){
                    return res.status(400).json({ msg: "Tidak atau terdapat banyak wajah!", code: 400 })
                }
            }
            // Check is thare have log data
            const now = new Date()
            const gte = `${now.getFullYear()}-${generator.generateZero(now.getMonth())}-${generator.generateZero(now.getDate())}T00:00:00.000+07:00`
            whereCluse.type = "Login"
            whereCluse.createdAt= {gte: new Date(gte)}
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
                role: isExist.roleuser.map((i)=>{
                    return i.role.name
                }),
                group: isExist.usergroup.map((i)=>{
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
            result.startTime = now.toISOString()
            if(todayLog){
                logData.type = "Logout"
                result.startTime = todayLog.createdAt.toISOString()
                result.endTime = now.toISOString()
            }

            // process create log
            await prisma.log.create({data:logData})
            return res.status(202).json({result})
        }
        res.status(400).json({ msg: "Request yang diminta salah", code: 400 })
    }
}