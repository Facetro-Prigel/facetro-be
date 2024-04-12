const { PrismaClient } = require('@prisma/client')
const generator = require('../helper/generator')
const prisma = new PrismaClient()
module.exports = {
    log: async (req, res) => {
        let body = req.body
        let identity = String(body.identity)
        let logAnywhere = false;
        if ((Object.keys(body).length == 1) && (body.identity != undefined)) {
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
                return res.status(404).json({ "device": req.device, "re": "sasas" })
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
            whereCluse.userUuid = isExist.uuid
            const now = new Date()
            const gte = `${now.getFullYear()}-${generator.generateZero(now.getMonth())}-${generator.generateZero(now.getDate())}T00:00:00.000+07:00`
            const lte = `${now.getFullYear()}-${generator.generateZero(now.getMonth())}-${generator.generateZero(now.getDate())}T23:59:59.999+07:00`
            whereCluse.type = "Login"
            whereCluse.createdAt= {gte: new Date(gte)}
            let todayLog = await prisma.log.findFirst({
                where: whereCluse 
            })
            let logData = {
                userUuid: isExist.uuid,
                bbox: ["bbox"],
                imagePath: "imagePath",
                deviceUuid: req.device.uuid,
                signature: "signature||"+generator.generateString(35),
                createdAt: now
            }
            logData.type = "Login"
            let result = {
                name: isExist.name,
                role: isExist.roleuser.map((i)=>{
                    return i.role.name
                }),
                group: isExist.usergroup.map((i)=>{
                    return {name:i.group.name, location:i.group.locations}
                }),
                identity: isExist.identityNumber,
                device: req.device.name
            }
            result.startTime = now.toISOString()
            if(todayLog){
                logData.type = "Logout"
                result.startTime = todayLog.createdAt.toISOString()
                result.endTime = now.toISOString()
            }
            await prisma.log.create({data:logData})
            return res.status(202).json({result})
        }
        res.status(400).json({ msg: "Request yang diminta salah", code: 400 })
    }
}