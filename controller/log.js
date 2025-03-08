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
    const sData = data.data
    return {
      isMatch: sData.isMatch === "True",
      bbox: sData.bbox,
      signature: sData.signiture,
      similarityResult: sData.similarityResult,
      lengthOfTimeRequired: sData.lengthOfTimeRequired
    };
  } catch (e) {
    if (e.response) {
      console.error(`Error form recognation service (${e.response.status}): ${e.response.data.detail}`);
      return { error: e.response.data.detail, code: e.response.status };
    } else {
      console.error(`Face recognation service dont response!`);
      console.error('details');
      console.error(e)
      return { error: `Terjadi kesalahan pada sistem pengenalan wajah`, code: 500 };
    }
  }
};


const makeTelegramNotification = async (image, ml_result, nameImage, teleParams) => {
  const image2tele = await utils.makeBondingBox(image, ml_result.bbox, nameImage)
  if (image2tele) {
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

const sandRecog = async (base64image, dbSignature) => {
  try {
    const { data } = await axios.post(`${process.env.ML_URL}recognation`, { image: base64image, data: dbSignature }, { headers: { "Content-Type": "application/json" } });
    const responseData = data.data[0]
    return responseData;
  } catch (e) {
    if (e.response) {
      console.error(`Error form recognation service (${e.response.status}): ${e.response.data.detail}`);
      return { error: e.response.data.detail, code: e.response.status };
    } else {
      console.error(`Face recognation service dont response!`);
      console.error('details');
      console.error(e)
      return { error: `Terjadi kesalahan pada sistem pengenalan wajah`, code: 500 };
    }
  }
};
module.exports = {
  log: async (req, res) => {
    try {
      const startTotalTimeNeeded = process.hrtime();
      let body = req.body
      let identity = String(body.identity)
      let image = body.image

      if ((Object.keys(body).length == 2) && (body.identity != undefined)) {
        const nameImage = `${generator.generateString(23)}.jpg`
        utils.saveImage(image, nameImage, 'log')
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
          select: {
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
        let ml_result = {};
        let candidateNumber = 0;
        const four_last_signatures_process = [];
        let selected_server_image = {};
        for (let signature of four_last_signatures) {
          ml_result = await compareFace(image, signature.signature);
          if (ml_result.error) {
            return res.status(ml_result.code).json({ msg: ml_result.error, code: ml_result.code });
          }
          selected_server_image = {
            candidateNumber,
            image: signature.imagePath,
            bbox: signature.bbox,
            signature: signature.signature,
            similarityResult: ml_result.similarityResult,
            lengthOfTimeRequired: ml_result.lengthOfTimeRequired
          };
          four_last_signatures_process.push(selected_server_image);
          if (ml_result.isMatch) break;
          candidateNumber++;
        }
        // Check is thare have log data
        const now = new Date()
        const gteValue = new Date(
          new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Jakarta",
            hourCycle: "h23",
          }).format(new Date())
        );
        whereCluse.type = "Login"
        whereCluse.createdAt = { gte: gteValue.toISOString() }
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
            image: selected_server_image.image,
            bbox: selected_server_image.bbox
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
          endCaptions = `\npulang pada \n > ${endTimeToHuman} \nWaktu yang dihabiskan \n > ${timeDiff} di ${req.device.name}`
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
        makeTelegramNotification(image, ml_result, nameImage, telegramParams)
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
    } catch (e) {
      console.error(e, "\n Masalah ini kemungkinan besar diakibatkan karena sistem pengenalan wajah tidak menyala")
      return res.status(500).json({ msg: "Terjadi kesalahan pada server", code: 500 })
    }
  },
  getLog: async (req, res) => {
    let logDatas = await prisma.log.findMany({
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
        group: log.user.usergroup.map((uy) => {
          return uy.group.name
        })
      })
    }
    return res.json(showLogs)
  },
  recognation: async (req, res) => {
    try {
      const deviceUuid = req.device.uuid;
      if (Object.keys(req.body).length !== 2) {
        return utils.createResponse(res, 400, "Bad Request", "Request yang diminta salah", "/log/recog");
      }

      let { image, type } = req.body;

      if (!utils.verifyImage(image)) {
        return utils.createResponse(res, 400, "Bad Request", "Gambar tidak valid!", "/log/recog");
      }
      let userListToFindInLog = []
      let dataContainer = []
      let permissionName = 'presence_anywhere'
      let privotTable = 'presence_group'
      let dbType = 'Login'
      if (type == 'doorlock') {
        permissionName = 'open_door_anywhere'
        privotTable = 'door_group'
        dbType = 'Door'
      }

      // Get deviceToUser (['door_group', 'precense'] -> group -> user_group -> user)
      const deviceToUser = await prisma.device.findUnique({
        where: { uuid: deviceUuid },
        select: {
          name: true,
          [privotTable]: {
            select: {
              group: {
                select: {
                  user_group: {
                    select: {
                      user: {
                        select: {
                          uuid: true,
                          signature: true,
                          avatar: true,
                          bbox: true,
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      })
      // Prosess user from deviceToUser 
      deviceToUser[privotTable].forEach(el => {
        el.group.user_group.forEach(ele => {
          let userData = ele.user
          dataContainer.push(
            {
              "user_uuid": userData.uuid,
              "signature": userData.signature,
              "file_path": userData.avatar,
              "bbox": userData.bbox
            }
          )
          userListToFindInLog.push(ele.user.uuid)
        });
      });

      // Get 1. user -> permission_user -> permission (guard_name: [type])
      //     2. user -> role_user -> role -> permssion_role -> permission (guard_name: [type])
      //     3. user -> role_user -> role (guard_name: 'super_admin')
      let userToPermissionRole = await prisma.user.findMany({
        where: {
          AND: [
            {
              OR: [
                {
                  permission_user: {
                    some: {
                      permission: {
                        is: {
                          guard_name: permissionName,
                        },
                      },
                    },
                  },
                },
                {
                  role_user: {
                    some: {
                      role: {
                        is: {
                          permission_role: {
                            some: {
                              permission: {
                                is: {
                                  guard_name: permissionName,
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
                {
                  role_user: {
                    some: {
                      role: {
                        is: {
                          guard_name: "super_admin",
                        },
                      },
                    },
                  },
                },
              ],
            },
            {
              uuid: {
                notIn: userListToFindInLog,
              },
            },
          ],
        },
        select: {
          uuid: true,
          signature: true,
          avatar: true,
          bbox: true,
        },
      })
      userToPermissionRole.forEach(el => {
        dataContainer.push(
          {
            "user_uuid": el.uuid,
            "signature": el.signature,
            "file_path": el.avatar,
            "bbox": el.bbox
          }
        )
        userListToFindInLog.push(el.uuid)
      });

      // From Log
      const userUuidsString = userListToFindInLog.map(uuid => `'${uuid}'`).join(", ");
      try {
        const logs = await prisma.$queryRawUnsafe(`
        SELECT *
        FROM (
          SELECT 
            user_uuid, 
            signature,
            bbox,
            image_path,
            RANK() OVER (PARTITION BY user_uuid ORDER BY created_at DESC) AS \`rank\`
          FROM Log
          WHERE is_match = 1 
        ) AS ranked_logs
        WHERE \`rank\` <= 4 AND user_uuid IN (${userUuidsString})
      `);

        const logs_data = await logs.map(log => {
          const { rank, ...rest } = log;
          return rest;
        });
        dataContainer = dataContainer.concat(logs_data)
      } catch (error) {
        console.error(error)
      }
      let recogResult = await sandRecog(image, dataContainer);
      if (recogResult.error) {
        return utils.createResponse(res, 404, 'Not Found!', `Maaf anda tidak terdaftar untuk ${type} di perangkat ini!`, '/log/recog');
      }
      const nameImage = `${generator.generateString(23)}.jpg`
      utils.saveImage(image, nameImage, 'log')
      const foundUser = await prisma.user.findUnique({
        where: {
          uuid: recogResult.user_uuid
        },
        select: {
          name: true,
          identity_number: true,
          role_user: {
            select: {
              role: {
                select: {
                  name: true
                }
              }
            }
          },
          user_group: {
            select: {
              group: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      })

      if (type != 'doorlock') {
        let localTime = new Date().toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          year: "numeric",
          day: '2-digit',
          month: '2-digit'
        })
        localTime = localTime.split('/')
        let nowDate = `${localTime[2]}-${localTime[1]}-${localTime[0]}`
        let startOfDayUTC = new Date(`${nowDate}T00:00:00.000+07:00`);
        let endOfDayUTC = new Date(`${nowDate}T23:59:59.500+07:00`);
        const logs = await prisma.log.findMany({
          where: {
            user_uuid: recogResult.user_uuid,
            type: 'Login',
            created_at: {
              gte: startOfDayUTC, // Greater than or equal to start of day in UTC
              lte: endOfDayUTC,   // Less than or equal to end of day in UTC
            },
          },
          orderBy: {
            created_at: 'desc', // Urutkan berdasarkan waktu terbaru
          },
          take: 1, // Ambil hanya satu entri (log terakhir)
        });
        if (logs.length > 0) {
          dbType = "Logout"
        }
      }

      const createLog = await prisma.log.create({
        data: {
          type: dbType,
          image_path: recogResult.compared_image,
          bbox: [0, 0, 160],
          signature: recogResult.input_signature,
          is_match: true,
          device_uuid: req.device.uuid,
          user_uuid: recogResult.user_uuid,
          other_data: {}
        }
      })
      console.info(dbType)

      const responseData = {
        name: foundUser.name,
        role: foundUser.role_user.map((i) => {
          return i.role.name;
        }),
        group: foundUser.user_group.map((i) => {
          return i.group.name;
        }),
        identity: foundUser.identity_number,
        device: deviceToUser.name,
        serverData: {
          image: recogResult.compared_image,
          bbox: recogResult.compared_bbox,
        },
        log_uuid: createLog.uuid
      }
      return utils.createResponse(res, 200, 'Succes', `Akses ${type} diizinkan!`, '/log/recog', responseData);
    } catch (error) {
      console.error(error);
      return utils.createResponse(res, 500, 'Internal Server Error', `Terjadi Kesalahan Fatal, Check input anda!`, '/log/recog');
    }
  },
  afterRecog: async (req, res) => {
    try {
      const deviceUuid = req.device.uuid;
      if (Object.keys(req.body).length !== 2) {
        return utils.createResponse(res, 400, "Bad Request", "Request yang diminta salah", "/log/afterRecog");
      }
      let { image, log_uuid } = req.body;
      const nameImage = `${generator.generateString(23)}.jpg`
      utils.saveImage(image, nameImage, 'log')
      let responseData;
      try {
        const { data } = await axios.patch(`${process.env.ML_URL}build`, { image: image}, { headers: { "Content-Type": "application/json" } });
        responseData = data.data[0]
      } catch (e) {
        console.error(e)
      }
      const updatedData = {
        bbox: responseData.bbox,
        image_path: nameImage
      }
      await prisma.log.update({
        where: {
          uuid: log_uuid,
          device_uuid: deviceUuid,
        },
        data: updatedData,
      });
      return utils.createResponse(res, 200, 'Succes!', `Data log telah diperbarui!`, '/log/afterRecog');
    } catch (error) {
        return utils.createResponse(res, 400, 'Bad Request!', `Terjadi Kesalahan Fatal, Check input anda!`, '/log/afterRecog');
    }
  }
}