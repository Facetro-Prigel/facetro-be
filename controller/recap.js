const { PrismaClient } = require('@prisma/client');
const { createResponse, streamToBuffer } = require("../helper/utils");
const ExcelJS = require('exceljs');
const path = require('path');
const minio_client = require('../minioClient'); // import minio client
const { DateTime } = require("luxon");
const prisma = new PrismaClient();

module.exports = {
  getRecap: async (req, res) => {
    const { start_date, end_date } = req.query;
    const workbook = new ExcelJS.Workbook();
    try {
      let query = {
        where: {
          AND: [
          {created_at: {
              gte: start_date? start_date : null,
              lte: end_date? end_date : null}},
          {
            OR: [
              { user_uuid: req.user.uuid },
              {
                user: {
                  is: {
                    user_group: {
                      some: {
                        group: {
                          is: {
                            notify_to: req.user.uuid
                          }
                        }
                      }
                    }
                  }
                }
              }
            ]
          }]
        },
        orderBy: {
          created_at: 'asc'
        },
        select: {
          is_match: true,
          image_path: true,
          bbox: true,
          type: true,
          user: {
            select: {
              name: true,
              identity_number: true,
              avatar: true,
              user_group: {
                include: {
                  group: {
                    include: {
                      presence_group: {
                        include: {
                          device: true
                        }
                      }
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

      if (req.show_other_log) {
        query.where.AND[1].OR = [{ NOT: null }]; // ini biar support AND gate biar true
      }

      const attendance_data = await prisma.log.findMany(query)
      
      // ini buat kurasi data biar ngga terlalu bloat pas proses ke excel
      const grouped_by_user = attendance_data.reduce((acc, log) => {
        const user_name = log.user.name;
        log.created_at = new Date(log.created_at).toISOString()
        const dateObj = DateTime.fromISO(log.created_at).setZone('Asia/Jakarta'); 
        const year = dateObj.year.toString();
        const month = dateObj.setLocale('id-ID').toFormat('LLLL')
        const date = dateObj.toISODate();
      
        if (!acc[user_name]) acc[user_name] = {};
        if (!acc[user_name][year]) acc[user_name][year] = {};
        if (!acc[user_name][year][month]) acc[user_name][year][month] = {};
        if (!acc[user_name][year][month][date]) acc[user_name][year][month][date] = {
          "Login": {},
          "Logout": {}
        };
      
        // Dorong log ke tanggal yang sesuai
        if (log.is_match){
          acc[user_name][year][month][date][log.type] = {
            created_at: dateObj.toISO(),
            image_path: log.image_path
          };
        }
      
        return acc;
      }, {});

      for (const user_name in grouped_by_user) {
        const worksheet = workbook.addWorksheet(user_name);
      
        const user = attendance_data.find(d => d.user.name == user_name)?.user;
        if (!user) continue;
        
          try {
            worksheet.mergeCells('A1:A4');
            worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
            if (user.avatar) {
              const avatarStream = await minio_client.getObject('avatar', user.avatar);
              const avatarBuffer = await streamToBuffer(avatarStream);
              if(avatarBuffer) {
                const avatarImageId = workbook.addImage({
                  buffer: avatarBuffer,
                  extension: "jpg"
                });
                worksheet.getColumn(1).width = 15;
                worksheet.addImage(avatarImageId, {
                  tl: { col: 0, row: 0 }, 
                  br: { col: 1, row: 4 },     
                  editAs: 'oneCell'
                });
              }
            }
          } catch (e) {
            console.warn("Avatar tidak ditemukan:", e.message);
          }
        const info = [
          ['Nama', user.name],
          ['NIM', user.identity_number],
          ['Proyek', user.user_group?.map(ug => ug.group.name).join(', ') || ''],
          ['Tempat bertugas', user.user_group.flatMap(ug => ug.group.presence_group.map(pg => pg.device.locations)).filter(Boolean).join(', ') || ''],
        ];
        info.forEach(([label, value], i) => {
          const row = i + 1;
        
          worksheet.mergeCells(`B${row}:C${row}`);
          const labelCell = worksheet.getCell(`B${row}`);
          labelCell.alignment = { vertical: 'middle', horizontal: 'center' };
          labelCell.value = label;
          labelCell.fill = { type: 'pattern',pattern: 'solid',fgColor: { argb: 'FFD9D9D9' }};
        
          worksheet.mergeCells(`D${row}:I${row}`);
          const valueCell = worksheet.getCell(`D${row}`);
          valueCell.alignment = { vertical: 'middle', horizontal: 'left' };
          valueCell.value = value;
        });
        const baseRow = 7;
        let baseCol = 1;
        const headers = ['Hari', 'Tanggal', 'Masuk', 'Gambar Masuk', 'Pulang', 'Gambar Keluar', 'Durasi'];
        const columns = [
          { header: 'Hari', width: 12 },
          { header: 'Tanggal', width: 12 },
          { header: 'Masuk', width: 10 },
          { header: 'Gambar Masuk', width: 'auto' },
          { header: 'Pulang', width: 10 },
          { header: 'Gambar Keluar', width: 'auto' },
          { header: 'Durasi', width: 25 },
        ];

        for (const year in grouped_by_user[user_name]) {
          const monthKeys = Object.keys(grouped_by_user[user_name][year]);

          for (const month of monthKeys) {
            const rows = grouped_by_user[user_name][year][month];
            worksheet.mergeCells(baseRow, baseCol, baseRow, baseCol + headers.length - 1);
            const title_cell = worksheet.getCell(baseRow, baseCol);
            title_cell.value = `${month} ${year}`;
            title_cell.alignment = { horizontal: 'center' };
            title_cell.font = { bold: true };
            title_cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF2CC' },
            };

            columns.forEach((col, i) => {
              const cell = worksheet.getCell(baseRow + 1, baseCol + i);
              cell.value = col.header;
              cell.font = { bold: true };
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD9D9D9' },
              };

              const worksheetCol = worksheet.getColumn(baseCol + i);
              worksheetCol.width = col.width === 'auto' ? col.header.length + 2 : col.width;
              worksheetCol.alignment = { horizontal: 'center', vertical: 'middle' };
            });

            let dailyIdx = 0;
            let total_duration = { hours: 0, minutes: 0, seconds: 0 };

            for (const date in rows) {
              const logs = rows[date];
              
              const login = logs.Login;
              const logout = logs.Logout;
            
              if (!login) continue; 
            
              const row = baseRow + dailyIdx + 2;
            
              const loginTime = DateTime.fromISO(login.created_at, { zone: 'Asia/Jakarta' });
              const logoutTime = Object.keys(logout).length != 0 ? DateTime.fromISO(logout.created_at, { zone: 'Asia/Jakarta' }) : null;
              const duration = logoutTime
                ? logoutTime.diff(loginTime, ['hours', 'minutes', 'seconds']).toObject()
                : null;

              total_duration = logoutTime ? {
                hours: total_duration.hours + Math.floor(duration.hours),
                minutes: total_duration.minutes + Math.floor(duration.minutes),
                seconds: total_duration.seconds + Math.floor(duration.seconds),
              } : total_duration;
            
              const formattedDuration = duration
                ? `${Math.floor(duration.hours)} jam ${Math.floor(duration.minutes)} menit ${Math.floor(duration.seconds)} detik`
                : '-';
            
              const hari = loginTime.setLocale('ID').toFormat('cccc');
              const tanggal = date;
              const masuk = loginTime.toFormat("HH:mm:ss");
              const pulang = logoutTime ? logoutTime.toFormat("HH:mm:ss") : '-';
              const fillColor = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: {
                  argb: logoutTime && duration && Math.floor(duration.hours) >= 8
                    ? 'FFCCFFCC' 
                    : 'FFFFCCCC'
                }
              };
              
              const day_cell = worksheet.getCell(row, baseCol);
              day_cell.value = hari;
              day_cell.fill = fillColor;
              
              const date_cell = worksheet.getCell(row, baseCol + 1);
              date_cell.value = tanggal;
              date_cell.fill = fillColor;
              
              const masuk_cell = worksheet.getCell(row, baseCol + 2);
              masuk_cell.value = masuk;
              masuk_cell.fill = fillColor;
              
              const pulang_cell = worksheet.getCell(row, baseCol + 4);
              pulang_cell.value = pulang;
              pulang_cell.fill = fillColor;
              
              const duration_cell = worksheet.getCell(row, baseCol + 6);
              duration_cell.value = formattedDuration;
              duration_cell.fill = fillColor;

              if (login.image_path) {
                try {
                  const loginImgStream = await minio_client.getObject('log', login.image_path);
                  const loginImgBuffer = await streamToBuffer(loginImgStream);
                  if (loginImgBuffer) {
                    const loginImgId = workbook.addImage({
                      buffer: loginImgBuffer,
                      extension: 'jpg',
                    });
                    
                    worksheet.getRow(row).height = 45; 
                    worksheet.getColumn(baseCol + 2).width = 10;
                    
                    worksheet.addImage(loginImgId, {
                      tl: { col: baseCol + 2, row: row - 1 },
                      br: { col: baseCol + 3, row: row },     
                      editAs: 'oneCell'
                    });
                  }
                } catch (e) {
                  console.warn("Gagal ambil gambar login:", e.message);
                }
              }

              if (logout?.image_path) {
                try {
                  const logoutImgStream = await minio_client.getObject('log', logout.image_path);
                  const logoutImgBuffer = await streamToBuffer(logoutImgStream);
                  if (logoutImgBuffer) {
                    const logoutImgId = workbook.addImage({
                      buffer: logoutImgBuffer,
                      extension: 'jpg',
                    });
                    
                    worksheet.getRow(row).height = 45; 
                    worksheet.getColumn(baseCol + 4).width = 10;
                    
                    worksheet.addImage(logoutImgId, {
                      tl: { col: baseCol + 4, row: row - 1 }, 
                      br: { col: baseCol + 5, row: row },
                      editAs: 'oneCell'
                    });
                  }
                } catch (e) {
                  console.warn("Gagal ambil gambar logout:", e.message);
                }
              }            
              dailyIdx++;
            }

            const total_row = baseRow + dailyIdx + 2;

            // Total
            total_duration.seconds %= 60;
            total_duration.minutes += Math.floor(total_duration.seconds / 60);
            total_duration.hours += Math.floor(total_duration.minutes / 60);
            const formattedTotal = `${total_duration.hours} jam ${total_duration.minutes} menit ${total_duration.seconds} detik`;

            const totalCell = worksheet.getCell(total_row, baseCol + 6);
            totalCell.value = formattedTotal;
            totalCell.font = { bold: true };
            totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
            totalCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: {
                argb: total_duration.hours >= 160 ? 'FFCCFFCC' : 'FFFFCCCC' 
              }
            };
          
            const labelCell = worksheet.getCell(total_row, baseCol + 5);
            labelCell.value = 'Total';
            labelCell.font = { bold: true };
            labelCell.alignment = { horizontal: 'center', vertical: 'middle' };
          
            baseCol += headers.length;
          }
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const base64file = buffer.toString('base64');

      return createResponse(res, 200, "Success", "Rekap Presensi berhasil diunduh", `/recap`, {
        file: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64file}`
      });
    } catch (error) {
      console.error('XLSX Export Error:', error);
      return createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/recap`);
    }
  }
};
