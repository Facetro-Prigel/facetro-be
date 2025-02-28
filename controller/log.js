const { PrismaClient } = require('@prisma/client')

const generator = require('../helper/generator')
const utils = require('../helper/utils')
const { bot } = require('../helper/telegram')
const axios = require('axios')
const role_utils = require('../helper/role_utils');
const prisma = new PrismaClient()
require('dotenv').config();

const compareFace = async (base64image, dbSignature) => {
    try {
        const { data } = await axios.post(`${process.env.ML_URL}match`, { image: base64image, signature: dbSignature }, { headers: { "Content-Type": "application/json" } });
        return {
            isMatch: data.isMatch === "True",
            bbox: data.bbox,
            signature: data.signiture,
            similarityResult: data.similarityResult,
            lengthOfTimeRequired: data.lengthOfTimeRequired
        };
    } catch (e) {
        if (e.response) {
            console.error(`Error form recognation service (${e.response.status}): ${e.response.data.message}`);
            return { error: e.response.data.message, code: e.response.status };
        }else{
            console.error(`Face recognation service dont response!`);
            console.error('details');
            console.error(e)
            return { error: `Terjadi kesalahan pada sistem pengenalan wajah`, code: 500 };
        }
    }
};

const checkMachineLearning = async (image, four_last_signatures) => {
    // Check to ML (Face Recognations)
    let ml_result = {};
    let candidateNumber = 0;
    const four_last_signatures_process = [];
    let selected_server_image = {};
    for (let signature of four_last_signatures) {
      ml_result = await compareFace(image, signature.signature);
      if (ml_result.error) {
        throw new Error("ComparationError");
      }
      selected_server_image = {
        candidateNumber,
        image: signature.image_path,
        bbox: signature.bbox,
        signature: signature.signature,
        similarityResult: ml_result.similarityResult,
        lengthOfTimeRequired: ml_result.lengthOfTimeRequired,
      };
      four_last_signatures_process.push(selected_server_image);
      if (ml_result.is_match) break;
      candidateNumber++;
    }
    return [selected_server_image, ml_result, four_last_signatures_process];
  };

const makeTelegramNotification = async (image, ml_result, nameImage, teleParams)=>{
    const image2tele = await utils.makeBondingBox(image, ml_result.bbox, nameImage)
    if(image2tele){
        setTimeout(async () => { 
            try {
            const { data } = await axios.post(`${process.env.TELE_URL}notify`, { 
                'user_tele_id': teleParams[0].telegramId ?? false,
                'ml_result': ml_result.isMatch,
                'notify_to': teleParams[1],
                'request_image_path': image2tele,
                'caption_for_else': teleParams[2],
                'caption_that_user': teleParams[3]
             }, { headers: { "Content-Type": "application/json" } });
            } catch (error) {
                console.error('Terjadi error ketika mencoba mengirim ke telegram handler!', error)        
            }
        }, 1000);
    }
}

const checkPermission = async (user_uuid, permission) => {
    try {
        const access = await prisma.user.findFirst({
            where: {
              uuid: isExist["uuid"],
              OR: [
                {
                  roleuser: {
                    some: {
                      role: {
                        is: {
                          guardName: "super_admin",
                        },
                      },
                    },
                  },
                },
                {
                  permissionUser: {
                    some: {
                      permission: {
                        is: {
                          guardName: "log_anywhere",
                        },
                      },
                    },
                  },
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
                                  guardName: "log_anywhere",
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              ],
            },
            include: {
              permissionUser: {
                include: {
                  permission: true,
                },
              },
              roleuser: {
                include: {
                  role: {
                    include: {
                      permisionrole: {
                        include: {
                          permission: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          });
  
        return Boolean(access);
    } catch (error) {
        console.error("Error checking access:", error);
        return false;
    }
  };
  
  const checkAccess = async (user, device) => {
    for (let i = 0; i < user.usergroup.length; i++) {
        if (user.usergroup[i].group.devices == device) {
            return true;
        }
    }
    return false;
  }          

const telegramPreprocessing = async (req, captionForElse, isExist, startTimeToHuman, ml_result, image, nameImage, endCaptions) => {
    let captionThatUser = `Kamu Bertugas di \n > ${req.device.name} \npresensi di \n > ${req.device.name} \nberangkat pada \n > ${startTimeToHuman}`
    captionThatUser += endCaptions ?? ''
    captionForElse = `Nama: \n > ${isExist.name} \nNomor Identitas:\n > ${isExist.identityNumber} \nProdi: \n > ${isExist.program_study} \nAngkatan: \n > ${isExist.batch}   \nProyek: \n > `
    captionForElse += utils.arrayToHuman(isExist.usergroup.map((t) => {
        return t.group.name
    })) + `\npresensi di \n > ${req.device.name} \nberangkat pada \n > ${startTimeToHuman}`
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
    const telegramParams = [isExist, [...notify_to], captionForElse, captionThatUser]
    try {
        await makeTelegramNotification(image, ml_result, nameImage, telegramParams)
        return true
    } catch (error) {
        return false
    }
}

const saveLogData = async (user, startTotalTimeNeeded, endMLTime, four_last_signatures, four_last_signatures_process, logData) => {
    const endTotalTimeNeeded = process.hrtime(startTotalTimeNeeded);
    const totalTimeNeeded =
      endTotalTimeNeeded[0] * 1000 + endTotalTimeNeeded[1] / 1e6;
    const mlTimeNeeded = endMLTime[0] * 1000 + endMLTime[1]/1e6;
    logData.otherData = {
      mlTimeNeeded: mlTimeNeeded,
      totalTimeNeeded: totalTimeNeeded,
      dataComparisonCandidate: four_last_signatures,
      dataComparisonCandidateAfterProcess: four_last_signatures_process,
      user: null
    };

    await prisma.log.create({ data: logData });
    return
}

const processLogDataV1 = (type, device_uuid, now, requestImagePath, user, ml_result) => {
    // process create log data
    let logData = {
        userUuid: user.uuid,
        bbox: ml_result.bbox,
        imagePath: requestImagePath,
        deviceUuid: device_uuid,
        signature: ml_result.signature,
        isMatch: ml_result.isMatch,
        createdAt: now
    }
    logData.type = type
    return logData
}

const processResultV1 = (user, ml_result, device_name, requestImagePath, selected_server_image) => {
    console.log(JSON.stringify(user));
    let result = {
        name: user.name,
        role: user.roleuser.map((i) => {
            return i.role.name
        }),
        group: user.usergroup.map((i) => {
            return i.group.name
        }),
        identity: user.identityNumber,
        device: device_name,
        isMatch: ml_result.isMatch,
        clientData: {
            image: requestImagePath,
            bbox: ml_result.bbox
        },
        serverData: {
            image: selected_server_image.image,
            bbox: selected_server_image.bbox
        }
    }
    return result
}

const getUserSignatures = async (user, where_clause) => {
    let four_last_signatures = await prisma.log.findMany({
        where: where_clause,
        take: 4,
        orderBy: {
            createdAt: "desc",
        },
        select: {
            imagePath: true,
            bbox: true,
            signature: true,
        },
    });
    four_last_signatures.push({
        imagePath: user.avatar,
        bbox: user.bbox,
        signature: user.signature,
    });
    
    return four_last_signatures
}

module.exports = {
    log: async (req, res) => {
        try {
            const startTotalTimeNeeded = process.hrtime();
            let body = req.body;
            let identity = String(body.identity);
            let image = body.image;
            let result; // intentionally put here to handle both presence and doorlock

            const nameImage = `${generator.generateString(23)}.jpg`;
            let requestImagePath = `photos/${nameImage}`;
            await utils.saveImage(image, requestImagePath);
            identity = identity.replace(/[^A-F0-9]/g, "");
      
            let isExist = await prisma.user.findFirst({
              where: {
                OR: [{ identityNumber: identity }, { nfc_data: identity }],
              },
              include: {
                roleuser: {
                  include: {
                    role: true,
                  },
                },
                usergroup: {
                  include: {
                    group: {
                      include: {
                        users: true,
                      },
                    },
                  },
                },
              },
            });
      
            if (!isExist) {
              utils.createResponse(res, 404, "Not Found", "User tidak ditemukan!", `/log/${body.type}/${identity}`);
            }
      
            let whereCluse = {};
      
            // combines data from User with the last 4 record logs
            whereCluse.userUuid = isExist.uuid;
            whereCluse.isMatch = true;
      
            if (Object.keys(body).length == 3 && body.identity != undefined) {
                if (body.type == "log") {

                    //grab 4 last logs and 1 avatar to compare
                    let four_last_signatures = await getUserSignatures(isExist, whereCluse);

                    // Check to ML (Face Recognations)
                    const startMLTime = process.hrtime();
                    let [selected_server_image, ml_result, four_last_signatures_process] = await checkMachineLearning(image, four_last_signatures);
                    const endMLTime = process.hrtime(startMLTime);
                    
                    // Check is thare have log data
                    const now = new Date()
                    const gteValue = `${now.getFullYear()}-${generator.generateZero(now.getMonth() + 1)}-${generator.generateZero(now.getDate())}T00:00:00.000+07:00`
                    whereCluse.type = "Login"
                    whereCluse.createdAt = { gte: new Date(gteValue).toISOString() }
                    let todayLog = await prisma.log.findFirst({
                        where: whereCluse
                    })
                    let logData = processLogDataV1(isExist, ml_result, req.device.uuid, now, requestImagePath, selected_server_image)
                    result = processResultV1(isExist, req.device.name, now, requestImagePath, isExist, ml_result)
                    let startTimeToHuman, endTimeToHuman, endCaptions, captionForElse
                    result.startTime = now.toISOString()

                    // mark as logout if the user has logged in today
                    if (todayLog) {
                        logData.type = "Logout"
                        result.startTime = todayLog.createdAt.toISOString()
                        result.endTime = now.toISOString()
                        endTimeToHuman = utils.timeToHuman(result.endTime)
                        let timeDiff = utils.countDiff(now.getTime() - todayLog.createdAt.getTime())
                        endCaptions = `\npulang pada \n > ${endTimeToHuman} \nWaktu yang dihabiskan \n > ${timeDiff} di ${req.device.name}`
                    }
                    startTimeToHuman = utils.timeToHuman(result.startTime)
                    // Other data
                    try {
                        await saveLogData(startTotalTimeNeeded, endMLTime, four_last_signatures, four_last_signatures_process, logData)
                    } catch (error) {
                        console.error("Terjadi error saat mau menyipan log data", error);
                    }

                    try {
                        await telegramPreprocessing(req, captionForElse, isExist, startTimeToHuman, ml_result, image, nameImage, endCaptions)
                    } catch (error) {
                        console.error("Terjadi error saat mau mengirim log ke telegram", error);
                    }

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
                } else if (body.type == "door") {
                    const startMLTime = process.hrtime();
                    // Check to ML (Face Recognations)
                    let [selected_server_image, ml_result, four_last_signatures_process] = await checkMachineLearning(image, four_last_signatures);
                    const endMLTime = process.hrtime(startMLTime);
                    
                    const now = new Date();
                    
                    let logData = processLogDataV1(isExist, ml_result, req.device.uuid, now, requestImagePath, selected_server_image)
                    result = processResultV1(isExist, req.device.name, now, requestImagePath, isExist, ml_result)
                    // Other data
                    try {
                        await saveLogData(startTotalTimeNeeded, endMLTime, four_last_signatures, four_last_signatures_process, logData)
                    } catch (error) {
                        console.error("Terjadi error saat mau menyipan log data", error);
                    }
                }
                const detail = body.type == "door" ? "Pintu berhasil dibuka" : "Presensi sudah tercatat";
                return utils.createResponse(res, 202, "Accepted", detail, `/log/${body.type}/${identity}`, {result});
            }else{
                return utils.createResponse(res, 400, "Bad Request", "Request yang diminta salah", "/log");
            }
        } catch (e) {
          console.error(e,"\n Masalah ini kemungkinan besar diakibatkan karena sistem pengenalan wajah tidak menyala");
          if (e.message == "ComparationError") {
            console.error(`Face recognation service dont response!`, e);
            return utils.createResponse(res, 400, "Bad Request", "Tidak ada atau terdapat banyak wajah!", "/log");
          }
          return utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", "/log");
        }
      },
      realtime: async (req, res) => {
        try {
            const start_total_time_needed = process.hrtime();
            if (Object.keys(req.body).length !== 2) {
                return utils.createResponse(res, 400, "Bad Request", "Request yang diminta salah", "/log/realtime");
            }
    
            let { image, type } = req.body;
            const device_uuid = req.device.uuid;
    
            if (!utils.verifyImage(image)) {
                return utils.createResponse(res, 400, "Bad Request", "Gambar tidak valid!", "/log/realtime");
            }
    
            // grab users from device
            const allowed_users = await prisma.user.findMany({
                where: {
                    usergroup: {
                        some: {
                            group: {
                                device: { uuid: device_uuid }
                            }
                        }
                    }
                },
                select: { uuid: true }
            });
    
            // may need another alternatives to ensure safety
            const users_log_data = await prisma.log.findMany({
                where: {
                    userUuid: {
                        in: allowed_users.map((u) => u.uuid),
                    },
                },
                orderBy: [
                    { userUuid: 'asc' }, // Untuk mempermudah grouping nantinya
                    { createdAt: 'desc' } // Order berdasarkan waktu terbaru
                ],
                select: {
                    userUuid: true,
                    imagePath: true,
                    signature: true,
                    bbox: true
                },
            });
            
            const grouped_logs = users_log_data.reduce((acc, log) => {
                if (!acc[log.userUuid]) acc[log.userUuid] = [];
                if (acc[log.userUuid].length < 4) acc[log.userUuid].push(log);
                return acc;
            }, {});
            
            // Konversi ke array
            const final_result = Object.values(grouped_logs).flat();            
    
            const startMLTime = process.hrtime();
            const ml_res = await axios.post(process.env.ML_URL + 'match', 
                { image, data: final_result }, 
                {
                    headers: { 'Content-Type': 'application/json' },
                    validateStatus: (status) => status < 500
                }
            );
            const endMLTime = process.hrtime(startMLTime);
    
            if (ml_res.status >= 400) {
                console.log("c")
                return utils.createResponse(res, ml_res.status, ml_res.title, "Gagal memproses data dari ML API", "/log/realtime");
            }
    
            let user = await prisma.user.findFirst({
                where: {
                    uuid: ml_res.data.user_uuid
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
                                    user: true
                                }
                            }
                        }
                    }
                }
            })
    
            const image_name=`${generator.generateString(23)}.jpg`
            const image_path = `photos/${image_name}`
            utils.saveImage(image, image_path)
            
            if (type === "log") {
                if (!checkPermission(user.uuid, "log_anywhere")) {
                    if (!checkAccess(user, req.device.uuid)){
                        return utils.createResponse(res, 403, "Forbidden", "Anda tidak boleh presensi di sini", "/log/realtime");
                    }

                    const now = new Date();

                    //formatting log data for frontend and db
                    const gte_value = `${now.getFullYear()}-${generator.generateZero(now.getMonth() + 1)}-${generator.generateZero(now.getDate())}T00:00:00.000+07:00`
                    
                    // grab today's log if there is any
                    let today_log_query = {
                        type: type,
                        createdAt: {gte: new Date(gte_value).toISOString()},
                        isMatch: "true",
                        userUuid: user_uuid
                    }
                    let today_log = await prisma.log.findFirst({where: today_log_query})

                    let log_data = processLogDataV2(user_uuid, ml_res, image_path, device_uuid, now)
                    let log_result = {
                        data: {
                            name: user.name,
                            role: user.roleuser.map(ru => ru.role.name),
                            group: user.usergroup.map(ug => ug.group.name),
                            identity: user.identityNumber,
                            device: req.device.name,
                            serverData: {
                                image: ml_res.compared_image, // is not the same with previous imlementation. may need to be revised
                                bbox: ml_res.compared_bbox,
                            },
                        },
                    };
    
                    let start_time_to_human, end_time_to_human, end_captions, caption_for_else;
                    log_result.startTime = now.toISOString();
    

                    
                    if (today_log) {
                        log_data.type = "Logout"
                        log_result.startTime = today_log.createdAt.toISOString()
                        log_result.endTime = now.toISOString()
                        end_time_to_human = utils.timeToHuman(log_result.endTime)
                        let time_diff = utils.countDiff(now.getTime() - today_log.createdAt.getTime())
                        end_captions = `\npulang pada \n > ${end_time_to_human} \nWaktu yang dihabiskan \n > ${time_diff} di ${req.device.name}`
                    }
    
                    // Other data
                    start_time_to_human = utils.timeToHuman(log_result.startTime)
                    const end_total_time_needed = process.hrtime(start_total_time_needed)
                    const total_time_needed = (end_total_time_needed[0] * 1000) + (end_total_time_needed[1] / 1e6);
                    log_data.otherData = {
                        'totalTimeNeeded': total_time_needed,
                        'dataComparisonCandidate': four_last_signatures,
                        'dataComparisonCandidateAfterProcess': four_last_signatures_process,
                    }
                    await prisma.log.create({ data: log_data })
                    let caption_that_user = `Kamu Bertugas di \n > ${req.device.name} \npresensi di \n > ${req.device.name} \nberangkat pada \n > ${start_time_to_human}`
                    caption_that_user += end_captions ?? ''
                    caption_for_else = `Nama: \n > ${user.name} \nNomor Identitas:\n > ${user.identityNumber} \nProdi: \n > ${user.program_study} \nAngkatan: \n > ${user.batch}   \nProyek: \n > `
                    caption_for_else += utils.arrayToHuman(user.usergroup.map((t) => {
                        return t.group.name
                    })) + `\npresensi di \n > ${req.device.name} \nberangkat pada \n > ${start_time_to_human}`
                    caption_for_else += end_captions ?? ''
                    log_result.endTime = now.toISOString()
                    log_result.endCaptions = end_captions ?? ''
    
                    // Send to Telegram!
                    let super_admin_users = await role_utils.getUserWithRole('super_admin', 'telegramId')
                    let admin_users = await role_utils.getUserWithRole('admin', 'telegramId')
                    let notify_to_group_users = user.usergroup.map((t) => {
                        return t.group.telegramId
                    })
    
                    let notify_to = new Set([...super_admin_users, ...admin_users, ...notify_to_group_users])
    
                    const telegram_params = [user, [...notify_to], caption_for_else, caption_that_user]
                    await utils.sendTelegram(telegram_params)
    
                    return utils.createResponse(res, 200, "Success", "Presensi berhasil dilakukan", `/device/${req.device.uuid}`, log_result)
                }
            } else if (type === "door") {
                if (!checkPermission(user.uuid, "door_anywhere")) {
                    if (!checkAccess(user, req.device.uuid)){
                        return utils.createResponse(res, 403, "Forbidden", "Anda tidak memiliki akses", `/device/${req.device.uuid}`);
                    }
                        //formatting log data for frontend and db
                        const gte_value = new Date(
                            new Intl.DateTimeFormat("en-US", {
                                timeZone: "Asia/Jakarta",
                                hourCycle: "h23",
                            }).format(new Date())
                            );
    
                        const now = new Date();
                        let log_data = {
                            userUuid: user_uuid,
                            bbox: ml_res.data.compared_bbox,
                            imagePath: image_path,
                            deviceUuid: device_uuid,
                            signature: ml_res.data.signature, // may not have been implemented yet
                            isMatch: ml_res.data.isMatch,
                            createdAt: now
                        }
                        let log_result = {
                            data: {
                                name: user.name,
                                role: user.roleuser.map(roleUser => roleUser.role.name),
                                group: user.usergroup.map(userGroup => userGroup.group.name),
                                identity: user.identityNumber,
                                device: req.device.name,
                                serverData: {
                                    image: ml_res.compared_image, // is not the same with previous imlementation. may need to be revised
                                    bbox: ml_res.compared_bbox,
                                },
                            },
                        };
    
                        let start_time_to_human, end_time_to_human, end_captions, caption_for_else;
                        log_result.startTime = now.toISOString();
    
                        // grab today's log if there is any
                        let today_log_query = {
                            type: type,
                            createdAt: {gte: gte_value.toISOString()},
                            isMatch: "true",
                            userUuid: user_uuid
                        }
                        let today_log = await prisma.log.findFirst({where: today_log_query})
                        
                        if (today_log) {
                            log_data.type = "Logout"
                            log_result.startTime = today_log.createdAt.toISOString()
                            log_result.endTime = now.toISOString()
                            end_time_to_human = utils.timeToHuman(log_result.endTime)
                            let time_diff = utils.countDiff(now.getTime() - today_log.createdAt.getTime())
                            end_captions = `\npulang pada \n > ${end_time_to_human} \nWaktu yang dihabiskan \n > ${time_diff} di ${req.device.name}`
                        }
    
                        // Other data
                        start_time_to_human = utils.timeToHuman(log_result.startTime)
                        const end_total_time_needed = process.hrtime(start_total_time_needed)
                        const total_time_needed = (end_total_time_needed[0] * 1000) + (end_total_time_needed[1] / 1e6);
                        log_data.otherData = {
                            'totalTimeNeeded': total_time_needed,
                            'dataComparisonCandidate': four_last_signatures,
                            'dataComparisonCandidateAfterProcess': four_last_signatures_process,
                        }
                        await prisma.log.create({ data: log_data })
                        return utils.createResponse(res, 200, "Success", "Presensi berhasil dilakukan", `/device/${req.device.uuid}`, log_result)
                }
            }
        } catch (e) {
            console.error(e);
            return utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/device/${req.device.uuid}`);
        }
    },
    getLog: async (req, res) => {
        let logDatas;
        try {
            await prisma.log.findMany({
                orderBy: [
                    {
                        createdAt: 'desc'
                    }
                ],
                select: {
                    isMatch: true,
                    imagePath: true,
                    bbox: true,
                    user: {
                        select: {
                            name: true,
                            identityNumber: true,
                            usergroup: {
                                select: {
                                    group: {
                                      select: {
                                        name: true
                                      }
                                    },
                                  },
                            }
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
                    type: log.type,
                    isMatch: log.isMatch,
                    inTime: log.createdAt,
                    group: log.user.usergroup.map((uy)=>{
                        return uy.group.name
                    })
                })
            }
        } catch (error) {
            console.error("Error while inserting group:", error);
            return utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/log`);
        }
        return utils.createResponse(res, 200, "Success", "Log berhasil diambil", `/log`, showLogs);
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
            const user = await prisma.user.findUnique({
                where: {
                    email: body.email
                }, select: {
                    name: true,
                    uuid: true
                }
            })
            numericUUID = utils.uuidToDecimal(user.uuid).slice(0, 20)
        } catch (error) {
            return utils.createResponse(res, 403, "Forbidden", "Kradensisal tidak cocok!", `/user/${user.uuid}`);
        }
        secretKey = BigInt(numericUUID) % BigInt(n);

        // Send challenge
        const challenge = Math.floor(Math.random() * 2);

        // Respond with the private key
        const y = (r * (secretKey ** BigInt(challenge) % BigInt(n))) % BigInt(n);

        // Verify
        const expectedResponse = (x * (BigInt(publicKey) ** BigInt(challenge) % BigInt(n))) % BigInt(n);
        if ((y ** BigInt(2)) % BigInt(n) === expectedResponse) {
            return utils.createResponse(res, 200, "Success", "Akses diizinkan!", `/user/${user.uuid}`);
        }
        return utils.createResponse(res, 403, "Forbidden", "Kradensisal tidak cocok!", `/user/${user.uuid}`);
    }
}