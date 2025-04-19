const { PrismaClient } = require('@prisma/client')

const generator = require('../helper/generator')
const utils = require('../helper/utils')
const axios = require('axios')
const role_utils = require('../helper/role_utils');
const prisma = new PrismaClient()
require('dotenv').config();

const compareFace = async (base64image, dbSignature) => {
  try {
    const { data } = await axios.post(`${process.env.ML_URL}match`, { image: base64image, signature: dbSignature }, { headers: { "Content-Type": "application/json" } });
    const sData = data.data[0]
    return {
      isMatch: sData.isMatch === "True",
      bbox: sData.bbox,
      signature: sData.signature,
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
          'user_tele_id': teleParams[0].telegram_id ?? false,
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
            "OR": [{ "identity_number": identity }, { "nfc_data": identity }],
          },
          include: {
            user_details: true,
            role_user: {
              include: {
                role: true
              }
            },
            user_group: {
              include: {
                group: {
                  include: {
                    users: true,
                    presence_group: true
                  }
                }
              }
            }
          }
        })
        // return utils.createResponse(res, 200, 'Test!', "Identitas tersebut tidak terdaftar", '/log', isExist)
        if (!isExist) {
          return utils.createResponse(res, 404, 'Not Found!', "Identitas tersebut tidak terdaftar", '/log')
        }

        isCanPresenceAnyware = await prisma.user.findFirst({
          where: {
            uuid: isExist["uuid"],
            OR: [
              {
                role_user: {
                  some: {
                    role: {
                      is: {
                        guard_name: 'super_admin'
                      }
                    }
                  }
                }
              }, {
                permission_user: {
                  some: {
                    permission: {
                      is: {
                        guard_name: "presence_anywhere"
                      }
                    }
                  }
                }
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
                                guard_name: "presence_anywhere"
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
            permission_user: {
              include: {
                permission: true
              }
            },
            role_user: {
              include: {
                role: {
                  include: {
                    permission_role: {
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
          for (let i = 0; i < isExist.user_group.length; i++) {
            for (let ind = 0; ind < isExist.user_group[i].group.presence_group.length; ind++) {
              if (isExist.user_group[i].group.presence_group[ind].device_uuid == req.device.uuid) {
                isDeviceOk = true
                break
              }
            }
          }
          if (!isDeviceOk) {
            return utils.createResponse(res, 403, 'Forbidden!', "Anda Tidak Dapat Presensi di sini", '/log')
          }
          whereCluse.device_uuid = req.device.uuid
        }
        // combines data from User with the last 4 record logs 
        whereCluse.user_uuid = isExist.uuid
        whereCluse.is_match = true
        const four_last_signatures = await prisma.log.findMany({
          where: whereCluse,
          take: 4,
          orderBy: {
            created_at: 'desc',
          },
          select: {
            image_path: true,
            bbox: true,
            signature: true
          }
        })
        four_last_signatures.push({
          image_path: isExist.avatar,
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
            return utils.createResponse(res, ml_result.code, 'Bad Request!', ml_result.error, '/log');
          }
          selected_server_image = {
            candidateNumber,
            image: signature.image_path,
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
        let now = new Date()
        let localTime = now.toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          year: "numeric",
          day: '2-digit',
          month: '2-digit'
        })
        localTime = localTime.split('/')
        let nowDate = `${localTime[2]}-${localTime[1]}-${localTime[0]}`
        whereCluse.type = "Login"
        whereCluse.created_at = { gte: new Date(`${nowDate}T00:00:00.000+07:00`) }
        let todayLog = await prisma.log.findFirst({
          where: whereCluse
        })
        // process create log data
        let logData = {
          user_uuid: isExist.uuid,
          bbox: ml_result.bbox,
          image_path: nameImage,
          device_uuid: req.device.uuid,
          signature: ml_result.signature,
          is_match: ml_result.isMatch,
          created_at: now
        }
        logData.type = "Login"
        let result = {
          name: isExist.name,
          role: isExist.role_user.map((i) => {
            return i.role.name
          }),
          group: isExist.user_group.map((i) => {
            return i.group.name
          }),
          identity: isExist.identity_number,
          device: req.device.name,
          isMatch: ml_result.isMatch,
          clientData: {
            image: nameImage,
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
          result.startTime = todayLog.created_at.toISOString()
          result.endTime = now.toISOString()
          endTimeToHuman = utils.timeToHuman(result.endTime)
          let timeDiff = utils.countDiff(now.getTime() - todayLog.created_at.getTime())
          endCaptions = `\npulang pada \n > ${endTimeToHuman} \nWaktu yang dihabiskan \n > ${timeDiff} di ${req.device.name}`
        }
        startTimeToHuman = utils.timeToHuman(result.startTime)
        // Other data
        const endTotalTimeNeeded = process.hrtime(startTotalTimeNeeded)
        const totalTimeNeeded = (endTotalTimeNeeded[0] * 1000) + (endTotalTimeNeeded[1] / 1e6);
        logData.other_data = {
          'totalTimeNeeded': totalTimeNeeded,
          'dataComparisonCandidate': four_last_signatures,
          'dataComparisonCandidateAfterProcess': four_last_signatures_process,
        }
        await prisma.log.create({ data: logData })
        let captionThatUser = `Kamu Bertugas di \n > ${req.device.name} \npresensi di \n > ${req.device.name} \nberangkat pada \n > ${startTimeToHuman}`
        captionThatUser += endCaptions ?? ''
        let user_details = {
          program_study: "-",
          batch: '-'
        }
        if (isExist.user_details) {
          user_details.program_study = isExist.user_details.program_study
          user_details.batch = isExist.user_details.batch
        }
        captionForElse = `Nama: \n > ${isExist.name} \nNomor Identitas:\n > ${isExist.identity_number} \nProdi: \n > ${(user_details.program_study)} \nAngkatan: \n > ${(user_details.batch)}   \nProyek:`
        captionForElse += isExist.user_group.map((t) => {
          return '\n> ' + t.group.name;
        })
        captionForElse += `\npresensi di \n > ${req.device.name} \nberangkat pada \n > ${startTimeToHuman}`
        captionForElse += endCaptions ?? ''
        // Send to Telegram!
        let super_admin_users = await role_utils.getUserWithRole('super_admin', 'telegram_id')
        let admin_users = await role_utils.getUserWithRole('admin', 'telegram_id')
        let notify_to_users = isExist.user_group.map((t) => {
          return t.group.users.telegram_id
        })
        let notify_to = []
        notify_to = notify_to.concat(super_admin_users, admin_users, notify_to_users)
        notify_to = new Set(notify_to)
        const telegramParams = [isExist, [...notify_to], captionForElse, captionThatUser]
        makeTelegramNotification(image, ml_result, nameImage, telegramParams)
        const io = req.app.get('socketio');
        if (ml_result.isMatch) {
          io.emit('backend emit', {
            name: isExist.name,
            project: result.group,
            device: req.device.name,
            photo: nameImage,
            bbox: ml_result.bbox,
            time: result.startTime,
            
            identifier: process.env.BE_WS_IDENTIFIER,
            address: 'logger update',
            backend_id: process.env.CONTAINER_ID
          })
        }
        return utils.createResponse(res, 200, 'Success!', `Berhasil Melakukan Presensi!`, '/log', result)
      }
      utils.createResponse(res, 400, 'Bad Request!', "Request yang diminta salah", '/log')
    } catch (e) {
      console.error(e, "\n Masalah ini kemungkinan besar diakibatkan karena sistem pengenalan wajah tidak menyala")

      return utils.createResponse(res, 500, 'Internal Server Error!', "Terjadi kesalahan pada server", '/log')
    }
  },
  getLog: async (req, res) => {
    const pageNumber = parseInt(req.query.page);
    const limitNumber = parseInt(req.query.limit);
    const search = req.query.search; // Ambil parameter pencarian
    const sort = req.query.sort || 'created_at'; // Default sort: created_at
    const order = req.query.order || 'desc'; // Default order: desc

    // Validasi input halaman dan limit
    if (isNaN(pageNumber) || isNaN(limitNumber) || pageNumber < 1 || limitNumber < 1) {
      return utils.createResponse(res, 400, 'Bad Request!', 'Anda harus menyertakan halaman dan berapa banyak yang ditampilkan!', '/log');
    }

    // Query dasar untuk menghitung total records
    const countQuery = {
      where: {
        user_uuid: req.user.uuid
      }
    };

    // Query dasar untuk mengambil data
    const defaultQuery = {
      where: {
        user_uuid: req.user.uuid
      },
      take: limitNumber,
      skip: ((pageNumber - 1) * limitNumber),
      orderBy: {}, // Placeholder untuk pengurutan
      select: {
        is_match: true,
        image_path: true,
        bbox: true,
        type: true,
        user: {
          select: {
            name: true,
            identity_number: true,
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
        },
        created_at: true,
        device: {
          select: {
            name: true
          }
        }
      }
    };

    // Jika show_other_log diaktifkan, hapus kondisi user_uuid
    if (req.show_other_log) {
      delete defaultQuery.where;
      delete countQuery.where;
      console.info('showOther');
    }

    // Tambahkan kondisi pencarian jika parameter search disediakan
    if (search) {
      const searchCondition = {
        OR: [
          { user: { name: { contains: search } } }, // Pencarian nama
          { user: { identity_number: { contains: search } } }, // Pencarian nomor identitas
          { device: { name: { contains: search } } }, // Pencarian nama perangkat
          { user: { user_group: { some: { group: { name: { contains: search } } } } } } // Pencarian grup
        ]
      };

      // Gabungkan kondisi pencarian dengan kondisi existing
      if (defaultQuery.where) {
        defaultQuery.where = { ...defaultQuery.where, ...searchCondition };
      } else {
        defaultQuery.where = searchCondition;
      }

      if (countQuery.where) {
        countQuery.where = { ...countQuery.where, ...searchCondition };
      } else {
        countQuery.where = searchCondition;
      }
    }

    // Tambahkan pengurutan berdasarkan parameter sort dan order
    const validSortFields = ['name', 'identity_number', 'device', 'group', 'inTime', 'type']; // Daftar kolom yang valid
    if (validSortFields.includes(sort)) {
      if (sort === 'inTime') {
        // Urutkan berdasarkan waktu (created_at)
        defaultQuery.orderBy = {
          created_at: order
        };
      }
      else if (sort === 'device') {
        defaultQuery.orderBy = {
          device: {
            name: order
          }
        }
      }
      else if (sort == 'type') {
        defaultQuery.orderBy = {
          type: order
        }
      }
      else if (sort === 'group') {
        defaultQuery.orderBy = {
          user: {
            user_group: {
              _count: order
            }
          }
        }
      }
      else{
        defaultQuery.orderBy={
          user: {
              [sort]: order
          }
        }
      }
    } else {
      // Default urutan: created_at descending
      defaultQuery.orderBy = {
        created_at: 'desc'
      };
    }

    try {
      // Hitung total records
      const total_records = await prisma.log.count(countQuery);

      // Ambil data log
      const logDatas = await prisma.log.findMany(defaultQuery);

      // Format data untuk respons
      const showLogs = logDatas.map((log) => ({
        name: log.user.name,
        identity_number: log.user.identity_number,
        device: log.device.name,
        image: log.image_path,
        bbox: log.bbox,
        type: log.type === 'Door' ? 'Door' : `Presence (${log.type})`,
        is_match: log.is_match,
        in_time: log.created_at,
        group: log.user.user_group.map((uy) => uy.group.name)
      }));

      // Kirim respons sukses
      return utils.createResponse(res, 200, 'Success!', 'Berhasil Mengambil Logs!', '/log', { data: showLogs, total_records });
    } catch (error) {
      console.error('Error fetching logs:', error);
      return utils.createResponse(res, 500, 'Internal Server Error!', 'Terjadi kesalahan saat mengambil logs!', '/log');
    }
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
              "image_path": userData.avatar,
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
            "image_path": el.avatar,
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


      const responseData = {
        name: foundUser.name,
        role: foundUser.role_user.map((i) => {
          return i.role.name;
        }),
        group: foundUser.user_group.map((i) => {
          return i.group.name;
        }),
        identity: foundUser.identity_number,
        device: req.device.name,
        serverData: {
          image: recogResult.compared_image,
          bbox: recogResult.compared_bbox,
        }

      }

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
            created_at: 'asc', // Urutkan berdasarkan waktu terbaru
          },
          take: 1, // Ambil hanya satu entri (log terakhir)
        });
        responseData['start_time'] = new Date()
        if (logs.length > 0) {
          dbType = "Logout"
          responseData['start_time'] = logs[0].created_at
          responseData['end_time'] = new Date()
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
      responseData.log_uuid = createLog.uuid
      return utils.createResponse(res, 200, 'Succes', `Pengguna Berhasil Ditemukan`, '/log/recog', responseData);
    } catch (error) {
      console.error(error);
      return utils.createResponse(res, 500, 'Internal Server Error', `Terjadi Kesalahan Fatal, Check input anda!`, '/log/recog');
    }
  },
  afterRecog: async (req, res) => {
    try {
      const deviceUuid = req.device.uuid;
      if (Object.keys(req.body).length !== 3) {
        return utils.createResponse(res, 400, "Bad Request", "Request yang diminta salah", "/log/afterRecog");
      }
      let { image, log_uuid, bbox } = req.body;
      // Validasi log_uuid harus UUID
      if (!utils.isValidUUID(log_uuid)) {
        return utils.createResponse(res, 400, "Bad Request", "log_uuid harus berupa UUID yang valid", "/log/afterRecog");
      }

      // Validasi image harus berupa Base64
      if (!utils.verifyImage(image, false)) {
        return utils.createResponse(res, 400, "Bad Request", "image harus berupa string Base64 yang valid", "/log/afterRecog");
      }

      // Validasi bbox harus array dengan panjang 3
      if (!Array.isArray(bbox) || bbox.length !== 3) {
        return utils.createResponse(res, 400, "Bad Request", "bbox harus berupa array dengan panjang 3", "/log/afterRecog");
      }
      const nameImage = `${generator.generateString(23)}.jpg`
      utils.saveImage(image, nameImage, 'log')
      const updatedData = {
        bbox: bbox ?? [0, 0, 1],
        image_path: nameImage
      }
      const updatedLog = await prisma.log.update({
        where: {
          uuid: log_uuid,
          device_uuid: deviceUuid,
        },
        data: updatedData,
      });
      let isExist = await prisma.user.findUnique({
        where: {
          uuid: updatedLog.user_uuid
        }, select: {
          name: true,
          identity_number: true,
          telegram_id: true,
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
                  name: true,
                  users: {
                    select: {
                      telegram_id: true
                    }
                  }
                }
              }
            }
          },
          user_details: {
            select: {
              program_study: true,
              batch: true
            }
          },
        }
      })
      if (updatedLog.type != 'Door') {

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
            user_uuid: updatedLog.user_uuid,
            type: { not: 'Door' },
            created_at: {
              gte: startOfDayUTC,
              lte: endOfDayUTC,
            },
          }, orderBy: {
            created_at: 'asc', // Urutkan berdasarkan waktu terbaru
          },
        });
        let endCaptions, endTimeToHuman
        let startTimeToHuman = utils.timeToHuman(logs[0].created_at);
        if (logs.length > 1) {
          endTimeToHuman = utils.timeToHuman(logs[logs.length - 1].created_at)
          let timeDiff = utils.countDiff(logs[logs.length - 1].created_at - logs[0].created_at)
          endCaptions = `\npulang pada \n > ${endTimeToHuman} \nWaktu yang dihabiskan \n > ${timeDiff} di ${req.device.name}`
        }
        let captionThatUser = `Kamu Bertugas di \n > ${req.device.name} \npresensi di \n > ${req.device.name} \nberangkat pada \n > ${startTimeToHuman}`
        captionThatUser += endCaptions ?? ''
        let user_details = {
          program_study: "-",
          batch: '-'
        }
        // return utils.createResponse(res, 200, 'Succes!', `Data log telah dipesrbarui!`, '/log/afterRecog', isExist);
        if (isExist.user_details) {
          user_details.program_study = isExist.user_details.program_study
          user_details.batch = isExist.user_details.batch
        }
        captionForElse = `Nama: \n > ${isExist.name} \nNomor Identitas:\n > ${isExist.identity_number} \nProdi: \n > ${(user_details.program_study)} \nAngkatan: \n > ${(user_details.batch)}   \nProyek: \n`
        captionForElse += isExist.user_group.map((t) => {
          return '\n>' + t.group.name;
        })
        captionForElse += `\npresensi di \n > ${req.device.name} \nberangkat pada \n > ${startTimeToHuman}`
        captionForElse += endCaptions ?? ''
        // Send to Telegram!
        let super_admin_users = await role_utils.getUserWithRole('super_admin', 'telegram_id')
        let admin_users = await role_utils.getUserWithRole('admin', 'telegram_id')
        let notify_to_users = isExist.user_group.map((t) => {
          return t.group.users.telegram_id
        })
        let notify_to = []
        notify_to = notify_to.concat(super_admin_users, admin_users, notify_to_users)
        notify_to = new Set(notify_to)
        const telegramParams = [isExist, [...notify_to], captionForElse, captionThatUser]
        makeTelegramNotification(image, { isMatch: true, bbox: updatedData.bbox }, nameImage, telegramParams)
      }
      const io = req.app.get('socketio');
      io.emit('backend emit', {
        name: isExist.name,
        project: utils.arrayToHuman(isExist.user_group.map((t) => {
          return t.group.name
        })),
        device: req.device.name,
        photo: nameImage,
        bbox: updatedData.bbox,
        time: new Date(),
        
        identifier: process.env.BE_WS_IDENTIFIER,
        address: 'logger update',
        backend_id: process.env.CONTAINER_ID
      })

      return utils.createResponse(res, 200, 'Succes!', `Data log telah diperbarui!`, '/log/afterRecog');
    } catch (error) {
      console.error(error)
      return utils.createResponse(res, 400, 'Bad Request!', `Terjadi Kesalahan Fatal, Check input anda!`, '/log/afterRecog');
    }
  }
}