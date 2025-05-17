const { PrismaClient } = require("@prisma/client");
const genPass = require('../helper/generator');
const { sendMail } = require('../helper/mailer');
const utils = require("../helper/utils");
const axios = require("axios");
const role_utils = require("../helper/role_utils");
const minioClient = require('../minioClient');
const { Console } = require("console");
const prisma = new PrismaClient();
const inputInsertUpdate = async (req) => {
  const validationReason = {
    email: "Format email standar",
    name: "Huruf besar, kecil, dan simbol ('), (.), dan (,)",
    identity_number: "Hanya angka",
    batch: "Angka dan boleh kosong",
    birthday: "Format ulang tahun yyyy-mm-dd",
    program_study: "Huruf besar, kecil, dan boleh kosong",
    phone_number: "Format nomor telepon dan boleh kosong",
  };
  const validationRules = {
    email: /^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Format email standar
    name: /^[A-Za-z' .,]+$/, // Huruf besar, kecil, dan simbol '
    identity_number: /^\d+$/, // Hanya angka
    batch: /^\d*$/, // Angka dan boleh kosong
    birthday: /^\d{4}-\d{2}-\d{2}$/, // Format ulang tahun yyyy-mm-dd
    program_study: /^[A-Za-z\s]*$/, // Huruf besar, kecil, dan boleh kosong
    phone_number: /^[\d{3}-\d{3}-\d{4}+]*$/, // Nomor telepon boleh kosong
  };
  const validateInput = (field, value) => {
    const regex = validationRules[field];
    return regex.test(value);
  };
  let errorVali = {}
  for (const field in validationRules) {
    if (req.body[field] != undefined) {
      const isValid = validateInput(field, req.body[field] ?? '');
      if (!isValid) {
        errorVali[field] = `Harusnya berisi ${validationReason[field]}`
      }
    }
  }
  if (Object.keys(errorVali).length) {
    console.error(errorVali)
    return { status: false, msg: 'Check kembali masukan data anda!', validateError: errorVali }
  }

  let s = {
    phone_number: req.body.phone_number,
    program_study: req.body.program_study
  }
  if (req.body.batch != undefined) {
    s.batch = parseInt(req.body.batch)
  }
  if (req.body.birthday) {
    s.birthday = new Date(req.body.birthday)
  }

  let data = {
    email: req.body.email,
    name: req.body.name,
    identity_number: req.body.identity_number,
    user_details: {
      upsert: {
        create: s,
        update: s
      }
    }
  };
  if (req.body.file_uuid) {
    try {
      tempData = await prisma.tempData.findUnique({ where: { uuid: req.body.file_uuid } })
      data.signature = tempData.data.signatureData
      data.avatar = tempData.data.image_path
      data.bbox = tempData.data.bbox
      await prisma.tempData.delete({ where: { uuid: req.body.file_uuid } })
    } catch {
      return { status: false, msg: "Id file salah" }
    }
  }
  return { status: true, data: data }
}
const checkDeleteUpdate = async (uuid, reqs) => {
  const user = await prisma.user.findUnique({
    where: {
      uuid: uuid
    },
    select: {
      created_at: true,
      role_user: {
        select: {
          role: {
            select: {
              guard_name: true
            }
          }
        }
      }
    }
  });
  return user
}
const calculateDailyPresenceMinutes = (logs) => {
  // Inisialisasi objek untuk menyimpan total menit per hari
  const dailyMinutes = [];

  if (logs.length === 0) {
    // Jika tidak ada log, kembalikan array kosong
    return dailyMinutes;
  }

  // Tentukan rentang tanggal dari logs
  const allDates = logs.map((log) => {
    const dateObj = new Date(log.created_at);
    return dateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  });

  const minDate = new Date(Math.min(...allDates.map((date) => new Date(date))));
  const maxDate = new Date(Math.max(...allDates.map((date) => new Date(date))));

  // Fungsi untuk mendapatkan semua tanggal dalam rentang
  const getAllDatesInRange = (startDate, endDate) => {
    const dates = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }));
      currentDate.setDate(currentDate.getDate() + 1); // Pindah ke hari berikutnya
    }
    return dates;
  };

  const allDatesInRange = getAllDatesInRange(minDate, maxDate);

  // Kelompokkan log berdasarkan tanggal (dalam zona waktu WIB)
  const groupedByDay = logs.reduce((acc, log) => {
    const dateObj = new Date(log.created_at);
    const date = dateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(dateObj); // Simpan timestamp dalam bentuk Date object
    return acc;
  }, {});

  // Hitung durasi untuk setiap hari dalam rentang tanggal
  allDatesInRange.forEach((date) => {
    const timestamps = groupedByDay[date];

    if (!timestamps || timestamps.length < 2) {
      // Jika tidak ada entri atau hanya satu entri, durasi dihitung sebagai 0
      dailyMinutes.push({ date, minutes: 0 });
      return;
    }

    // Urutkan timestamp secara ascending
    timestamps.sort((a, b) => a - b);

    // Hitung durasi antara entri pertama dan terakhir (dalam menit)
    const durationMs = timestamps[timestamps.length - 1] - timestamps[0];
    const durationMinutes = Math.round((durationMs / (1000 * 60)) * 100) / 100;

    // Simpan hasil dalam objek dailyMinutes
    dailyMinutes.push({ date, minutes: durationMinutes });
  });

  // Mengembalikan hasil sebagai array untuk konsistensi
  return dailyMinutes;
};
module.exports = {
  birthday_image: async (req, res) => {
    const path = require('path');
    try {
      const uuid = req.user.uuid;
      const birthdayData = await prisma.user.findUnique({
        where: { uuid: uuid },
        select: {
          name: true,
          avatar: true,
          bbox: true,
          user_details: {
            select: {
              birthday: true,
            },
          },
        },
      });
      if (!birthdayData || !birthdayData.user_details?.birthday) {
        return utils.createResponse(res, 400, "Bad Request", "Pengguna belum mengisikan tanggal lahir!", `/birthday/${uuid}`);
      }
      try {
        const stream = await minioClient.getObject('design', 'birthday_' + birthdayData.avatar);
        const chunks = [];
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
        let img = Buffer.concat(chunks);
        const base64Image = Buffer.from(img, 'binary').toString('base64');
        const base64Data = `data:image/jpeg;base64,${base64Image}`;
        return utils.createResponse(res, 200, "Success", "Gambar birthday berhasil diambil", `/birthday/${uuid}`, base64Data);
      } catch (error) {
        try {
          const birthday = birthdayData.user_details.birthday;
          const age = utils.calculateAge(birthday);
          const stream = await minioClient.getObject('transparent', birthdayData.avatar.replace('.jpg', '.png'));
          const chunks = [];
          for await (const chunk of stream) {
            chunks.push(chunk);
          }
          let transparent = Buffer.concat(chunks);
          let BirthdayCard = await utils.makeDesign('birthday', transparent, birthdayData.bbox, {
            'date': new Date(birthday).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: "long" }),
            'name': utils.transformSentence(birthdayData.name),
            'age': age
          })
          utils.saveImage(BirthdayCard, 'birthday_' + birthdayData.avatar, 'design')
          const base64Image = Buffer.from(BirthdayCard, 'binary').toString('base64');
          const base64Data = `data:image/jpeg;base64,${base64Image}`;
          return utils.createResponse(res, 200, "Success", "Gambar birthday berhasil diambil", `/birthday/${uuid}`, base64Data);
        } catch (error) {
          console.error('Fatal error transparnt not aviable', error);
          return utils.createResponse(res, 500, "Internal Server Error", "Gambar frontground tidak ada!", `/birthday/${uuid}`);
        }
      }
    } catch (error) {
      console.error("Error:", error.message);
      return utils.createResponse(res, 500, "Internal Server Error", "Fatal Error!", `/birthday/${uuid}`);
    }
  },
  unnes_image: async (req, res) => {
    try {
      const identity_number = req.user.identity_number
      let url = `${process.env.UNNES_API}/primer/user_ava/${identity_number}/541.aspx`
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'cookie': 'cf_clearance=dxCyQam3QQ4ik5VHdf1uYqTlIr18NKOwIrwAUpCAfys-1726411014-1.2.1.1-A19b88gywzglUgELQxT9PIqixu2o5U.vjpKgeEW0hIu8WT.zZ5M4mHE3RRPAzSq4M8O7qIgv_Qo1T1GLMV50NUNfAZ60ghUBMCU9Janyhnw29mlSCLhspnagAz4vn7wvmFagyNuOcbWFz8o_bEVeLvRTfo4St7UyQS99LGe28ptNpug2a.PAY_RhOy.FgCpOKY6WW3h6txIPvArYfl7SqZFN78sddgRH0aq098a156MIReO2ctkcygMibtiS9jhYwuwF8A4ge52N18dyR2IuF2kQsewnACvHCcyoy5wUzuS9QKR1DzV_XIMCeTtFiuoXdCPSh85bnW.oKTmWioe_rgoNCoxIr2kcK7BoNLRPlZes_pp8szpAORdfu9pg01z0'
        } // Set response type to arraybuffer for binary data
      });
      const base64Image = Buffer.from(response.data, 'binary').toString('base64');
      const mimeType = response.headers['content-type'];
      const base64Data = `data:${mimeType};base64,${base64Image}`;
      if (mimeType == 'image-png') {
        return utils.createResponse(res, 404, "Not Found", "Gambar tersebut tidak tersedia", `/unnes_image/${identity_number}`);
      }

      return utils.createResponse(res, 200, "Success", "Gambar UNNES berhasil diambil", `/unnes_image/${identity_number}`, base64Data);
    } catch (error) {
      return utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat mengambil gambar dari UNNES", `/unnes_image/${identity_number}`);
    }

  },
  upload_image: async (req, res) => {
    try {
      // Validasi input
      const { image } = req.body;
      if (!image) {
        return utils.createResponse(res, 400, "Bad Request", "Gambar tidak ditemukan!", "/myprofile/image");
      }

      // Konfigurasi Axios
      const config_u = { headers: { "Content-Type": "application/json" } };

      // Step 1: Kirim gambar ke endpoint ML untuk diproses
      let mlResponse;
      try {
        mlResponse = await axios.post(`${process.env.ML_URL}build`, { image }, config_u);
      } catch (mlError) {
        console.error("ML Build Error:", mlError.message || mlError);
        return utils.createResponse(
          res,
          400,
          "Bad Request",
          "Tidak ada atau terdapat banyak wajah!",
          "/myprofile/image"
        );
      }

      // Ambil data hasil pemrosesan ML
      const { data: mlData } = mlResponse;
      if (!mlData || !mlData.data || mlData.data.length === 0) {
        return utils.createResponse(
          res,
          400,
          "Bad Request",
          "Data wajah tidak valid!",
          "/myprofile/image"
        );
      }

      const processedData = mlData.data[0];

      // Step 2: Simpan gambar asli
      const requestImagePath = `${genPass.generateString(23)}.jpg`;
      utils.saveImage(image, requestImagePath, "photos");

      // Step 3: Generate avatar dengan menambahkan query string `type=profile`
      try {
        const avatarResponse = await axios.patch(
          `${process.env.ML_URL}build?type=profile`,
          { image },
          config_u
        );
        const avatar = avatarResponse.data.data[0].croppedImage;
        utils.saveImage(avatar, requestImagePath, "avatar");
      } catch (avatarError) {
        console.error("Avatar Generation Error:", avatarError.message || avatarError);
      }

      // Step 4: Generate gambar transparan (remove background)
      try {
        const transparentResponse = await axios.post(
          `${process.env.ML_URL}remove_bg`,
          { image },
          config_u
        );
        const transparent = transparentResponse.data.data[0];
        utils.saveImage(
          transparent,
          requestImagePath.replace(".jpg", ".png"),
          "transparent"
        );
      } catch (transparentError) {
        console.error("Transparent Background Error:", transparentError.message || transparentError);
      }

      // Step 5: Simpan data ke database
      try {
        processedData.image_path = requestImagePath;
        const uuid = await prisma.tempData.create({
          data: { data: processedData },
        });

        // Return success response
        return utils.createResponse(
          res,
          201,
          "Created",
          "Gambar berhasil disimpan!",
          "/myprofile/image",
          { file_uuid: uuid.uuid, path: processedData.image_path }
        );
      } catch (dbError) {
        console.error("Database Error:", dbError.message || dbError);
        return utils.createResponse(
          res,
          500,
          "Internal Server Error",
          "Terjadi kesalahan saat menyimpan data ke database",
          "/myprofile/image"
        );
      }
    } catch (error) {
      console.error("General Error:", error.message || error);
      return utils.createResponse(
        res,
        500,
        "Internal Server Error",
        "Terjadi kesalahan saat memproses permintaan",
        "/myprofile/image"
      );
    }
  },
  getter: async (req, res) => {
    let user_data;
    let uuid = req.user.uuid;
    try {

      user_data = await prisma.user.findUnique({

        where: { uuid: req.user.uuid },
        select: {
          uuid: true,
          name: true,
          identity_number: true,
          email: true,
          bbox: true,
          avatar: true,
          telegram_id: true,
          nfc_data: true,
          permission_user: {
            select: {
              uuid: true,
              permission: {
                select: {
                  uuid: true,
                  name: true,
                  guard_name: true
                }
              },
            },
          },
          role_user: {
            select: {
              uuid: true,
              role: {
                select: {
                  uuid: true,
                  name: true,
                  guard_name: true
                }
              },
            },
          },
          user_group: {
            select: {
              uuid: true,
              group: {
                select: {
                  uuid: true,
                  name: true
                }
              }
            },
          },
          user_details: {
            select: {
              phone_number: true,
              batch: true,
              birthday: true,
              program_study: true
            }
          }
        }
      });
      user_data.recovery_token = utils.encryptText(user_data.uuid+','+user_data.email)
    } catch (error) {
      console.error(error);
      return utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/myprofile/${uuid}`);
    }
    return utils.createResponse(res, 200, "Success", "Seluruh pengguna berhasil diambil", `/myprofile/${uuid}`, user_data);
  },
  update: async (req, res) => {
    let uuid = req.user.uuid
    try {
      const user = await checkDeleteUpdate(req.user.uuid, req)
      if (!user) {
        return utils.createResponse(res, 404, "Not Found", "Pengguna tidak ditemukan", `/myprofile/${req.user.uuid}`);
      }
      var data = await inputInsertUpdate(req)
      if (data.status == false) {
        return utils.createResponse(res, 400, "Bad Request", "Ada yang salah dengan input yang Anda berikan!", `/myprofile/${req.user.uuid}`, data.validateError);
      }
      data = data.data
      data.modified_at = new Date()
      const updateUser = await prisma.user.update({
        where: { uuid: req.user.uuid },
        data: data
      });
    } catch (error) {
      console.error(error)
      return utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/myprofile`);
    }
    utils.webSockerUpdate(req)
    return utils.createResponse(res, 200, "Success", "Pengguna berhasil diperbarui", `/myprofile/${uuid}`);
  },
  dashboard: async (req, res) => {
    const uuid = req.user.uuid;
    try {
      const now = new Date();
      let localTime = new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        year: "numeric",
        day: '2-digit',
        month: '2-digit'
      })
      localTime = localTime.split('/')
      let nowDate = `${localTime[2]}-${localTime[1]}-${localTime[0]}`
      const today_start = new Date(`${nowDate}T00:00:00.000+07:00`);
      const today_end = new Date(`${nowDate}T23:59:59.500+07:00`);
      const week_start = new Date(utils.getSpecificDayOfWeek(now, 0)+'T00:00:00.000+07:00');
      const month_start = new Date(`${localTime[2]}-${localTime[1]}-01T00:00:00.000+07:00`);
      let monthStartSemester = parseInt(localTime[1]) > 7 ? '07' : '01';
      const semester_start = new Date(`${localTime[2]}-${monthStartSemester}-01T00:00:00.000+07:00`);

      const [this_week_log, this_month_log, this_semester_log, today_log] = await Promise.all([
        prisma.log.findMany({
          select: { created_at: true, type: true },
          where: {
            user_uuid: uuid,
            type: { in: ['Login', 'Logout'] },
            is_match: true,
            created_at: { gte: week_start, lte: now }
          },
          orderBy: { created_at: 'asc' }
        }),
        prisma.log.findMany({
          select: { created_at: true, type: true },
          where: {
            user_uuid: uuid,
            type: { in: ['Login', 'Logout'] },
            is_match: true,
            created_at: { gte: month_start, lte: now }
          },
          orderBy: { created_at: 'asc' }
        }),
        prisma.log.findMany({
          select: { created_at: true, type: true },
          where: {
            user_uuid: uuid,
            type: { in: ['Login', 'Logout'] },
            is_match: true,
            created_at: { gte: semester_start, lte: now }
          },
          orderBy: { created_at: 'asc' }
        }),
        prisma.log.findMany({
          select: { created_at: true, type: true },
          where: {
            user_uuid: uuid,
            type: { in: ['Login', 'Logout'] },
            is_match: true,
            created_at: { gte: today_start, lte: today_end }
          },
          orderBy: { created_at: 'asc' }
        })
      ]);

      const calculatePresenceMinutes = (logs) => {
        const groupedByDay = logs.reduce((acc, log) => {
          const date = new Date(log.created_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });
          if (!acc[date]) acc[date] = [];
          acc[date].push(new Date(log.created_at));
          return acc;
        }, {});

        return Object.entries(groupedByDay).reduce((totalMinutes, [date, timestamps]) => {
          if (timestamps.length < 2) return totalMinutes;
          timestamps.sort((a, b) => a - b);
          const minutes = (timestamps[timestamps.length - 1] - timestamps[0]) / (1000 * 60);
          return totalMinutes + minutes;
        }, 0);
      };

      // Menentukan Login pertama dan Logout terakhir hari ini
      const today_login = [...today_log].reverse().find(log => log.type === 'Login')?.created_at || null;
      const today_logout = [...today_log].reverse().find(log => log.type === 'Logout')?.created_at || null;

      return utils.createResponse(res, 200, "Success", "Log pengguna berhasil ditemukan", `/user/${uuid}/log`, {
        daily_minutes: calculateDailyPresenceMinutes(this_week_log),
        weekly_minutes: calculatePresenceMinutes(this_week_log),
        monthly_minutes: calculatePresenceMinutes(this_month_log),
        semester_minutes: calculatePresenceMinutes(this_semester_log),
        today_login,
        today_logout
      });
    } catch (error) {
      console.error(JSON.stringify(`${error}: ${error.message}`));
      return utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/user/${uuid}/log`);
    }
  }
};
