const { PrismaClient } = require('@prisma/client');
const { createResponse, streamToBuffer } = require("../helper/utils");
const ExcelJS = require('exceljs');
const path = require('path');
const minio_client = require('../minioClient'); // import minio client
const { DateTime } = require("luxon");
const prisma = new PrismaClient();

const quickRecapAddRow = (data, column, column_width, value) => {
  data[column] = value;
  column_width[column] = Math.max(column_width[column], value.length);
}

const fullRecapAddRow = (worksheet, row, baseCol, value, fillColor) => {
  const cell = worksheet.getCell(row, baseCol);
  cell.value = value;
  cell.fill = fillColor;
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.font = { name: "Helvetica", size: 12 };
  cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
}
const renderLegend = (worksheet, start_cell, end_cell, value, fillColor) => {
  worksheet.mergeCells(`${start_cell}:${end_cell}`);
  const cell = worksheet.getCell(start_cell)
  cell.value = value;
  cell.alignment = { vertical: 'middle', horizontal: 'left' };
  cell.fill = fillColor;
}
module.exports = {
  getQuickRecap: async (req, res) => {
    let { start_date, end_date, columns } = req.query;

    const defaultColumns = ['photo', 'name', 'identity_number', 'device', 'type', 'in_time', 'group'];
    columns = columns ? columns.split(',') : defaultColumns;

    start_date = start_date
      ? DateTime.fromISO(start_date, { zone: "Asia/Jakarta" }).startOf('day').toUTC().toJSDate()
      : undefined;
    end_date = end_date
      ? DateTime.fromISO(end_date, { zone: "Asia/Jakarta" }).endOf('day').toUTC().toJSDate()
      : undefined;

    const columnWidths = {};

    try {
      let query = {
        where: {
          AND: [
            { created_at: { gte: start_date, lte: end_date } },
            { OR: [
              { user_uuid: req.user.uuid },
              {
                user: {
                  is: {
                    user_group: {
                      some: {
                        group: {
                          is: { notify_to: req.user.uuid }
                        }
                      }
                    }
                  }
                }
              }
            ]
          }]
        },
        orderBy: { created_at: 'desc' },
        select: {
          is_match: true,
          image_path: true,
          bbox: true,
          type: true,
          created_at: true,
          user: {
            select: {
              name: true,
              identity_number: true,
              user_group: {
                select: {
                  group: {
                    select: { name: true }
                  }
                }
              }
            }
          },
          device: {
            select: { name: true }
          }
        }
      };

      if (req.show_other_log) delete query.where;

      const attendanceData = await prisma.log.findMany(query);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Rekap Presensi');

      const columnMap = {
        photo: { header: 'Photo', width: 15 },
        name: { header: 'Name' },
        identity_number: { header: 'Identity Number' },
        device: { header: 'Presence In' },
        type: { header: 'Login/Logout', width: 15 },
        in_time: { header: 'Waktu' },
        group: { header: 'Group' }
      };

      worksheet.columns = columns.map(col => ({
        header: columnMap[col]?.header || col,
        key: col,
        width: columnMap[col]?.width || 10
      }));

      worksheet.getRow(1).eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF007BFF' }
        };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      let rowIndex = 2;

      for (const entry of attendanceData) {
        const rowData = {};

        if (columns.includes('name')) rowData.name = entry.user?.name || '';
        if (columns.includes('identity_number')) rowData.identity_number = entry.user?.identity_number || '';
        if (columns.includes('device')) rowData.device = entry.device?.name || '';
        if (columns.includes('type')) rowData.type = entry.type || '';
        if (columns.includes('in_time')) {
          rowData.in_time = new Date(entry.created_at).toLocaleString('id-ID');
        }
        if (columns.includes('group')) {
          rowData.group = entry.user?.user_group?.map(g => g.group.name).join(', ') || '';
        }

        worksheet.getRow(rowIndex).height = 60;

        for (const [colIndex, colKey] of columns.entries()) {
          const cell = worksheet.getCell(rowIndex, colIndex + 1);

          if (colKey === 'photo') continue; // akan diisi dengan gambar

          const value = rowData[colKey] || '';
          cell.value = value;
          cell.alignment = { vertical: 'middle', horizontal: 'center' };

          columnWidths[colKey] = Math.max(columnWidths[colKey] || 0, String(value).length);
        }

        // Tambahkan gambar jika ada kolom photo
        if (columns.includes('photo') && entry.image_path) {
          try {
            const stream = await minio_client.getObject('log', entry.image_path);
            const imageBuffer = await streamToBuffer(stream);

            const imageId = workbook.addImage({
              buffer: imageBuffer,
              extension: path.extname(entry.image_path).slice(1) || 'jpeg'
            });

            const photoColIndex = columns.indexOf('photo');
            worksheet.addImage(imageId, {
              tl: { col: photoColIndex, row: rowIndex - 1 },
              br: { col: photoColIndex + 1, row: rowIndex }
            });
          } catch (err) {
            console.warn(`Gagal mengambil gambar dari MinIO ${entry.image_path}:`, err.message);
          }
        }

        rowIndex++;
      }


      columns.forEach(col => {
        if (col !== 'photo') {
          worksheet.getColumn(col).width = (columnWidths[col] || 10) + 2;
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const base64file = buffer.toString('base64');

      return createResponse(res, 200, "Success", "Rekap Presensi berhasil diunduh", `/recap`, {
        file: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64file}`
      });
    } catch (error) {
      console.error('XLSX Export Error:', error);
      utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/recap`);
    }
  },

  getFullRecap: async (req, res) => {
    let { start_date, end_date } = req.query;
    start_date = start_date ? DateTime.fromISO(start_date, { zone: "Asia/Jakarta" }).startOf('day').toUTC().toJSDate() : undefined
    end_date = end_date ? DateTime.fromISO(end_date, { zone: "Asia/Jakarta" }).endOf('day').toUTC().toJSDate() : undefined;
    const workbook = new ExcelJS.Workbook();
    try {
      let query = {
        where: {
          AND: [
          {created_at: {
              gte: start_date? start_date : undefined,
              lte: end_date? end_date : undefined}},
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
        query.where.AND[1].OR = [{}];
      }

      const attendance_data = await prisma.log.findMany(query)
      
      const grouped_by_user = {}; 

      for (const log of attendance_data) {
        const user_name = log.user.name;
        const logDate = DateTime.fromJSDate(new Date(log.created_at)).setZone('Asia/Jakarta');
        const isoDate = logDate.toISODate();
        const year = logDate.year.toString();
        const month = logDate.setLocale('id-ID').toFormat('LLLL');

        if (!grouped_by_user[user_name]) {
          grouped_by_user[user_name] = {
            [year]: {},
            min: logDate,
            max: logDate
          };
        }

        const user = grouped_by_user[user_name];

        if (logDate < user.min) user.min = logDate;
        if (logDate > user.max) user.max = logDate;

        if (!user[year][month]) user[year][month] = {};
        if (!user[year][month][isoDate]) {
          user[year][month][isoDate] = { Login: {}, Logout: {} };
        }

        if (log.is_match) {
          user[year][month][isoDate][log.type] = {
            created_at: logDate.toISO(),
            image_path: log.image_path
          };
        }
      }

      for (const user of Object.values(grouped_by_user)) {
        const map = user;

        let cursor = user.min.startOf('month');
        const end = user.max.endOf('month');

        while (cursor <= end) {
          const isoDate = cursor.toISODate();
          const year = cursor.year.toString();
          const month = cursor.setLocale('id-ID').toFormat('LLLL');

          if (!map[year]) map[year] = {};
          if (!map[year][month]) map[year][month] = {};
          if (!map[year][month][isoDate]) {
            map[year][month][isoDate] = { Login: {}, Logout: {} };
          }

          cursor = cursor.plus({ days: 1 });
        }

        delete user.min;
        delete user.max;
      }

      for (const user_name in grouped_by_user) {
        const worksheet = workbook.addWorksheet(user_name);
      
        const user = attendance_data.find(d => d.user.name == user_name)?.user;
        if (!user) continue;
        
          try {
            worksheet.mergeCells('A1:A4');
            worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
            if (user.avatar) {
              try {
                const avatarStream = await minio_client.getObject('avatar', user.avatar);
                const avatarBuffer = await streamToBuffer(avatarStream);
                if(avatarBuffer) {
                  const avatarImageId = workbook.addImage({
                    buffer: avatarBuffer,
                    extension: "jpg"
                  });
                  worksheet.getColumn(1).width = 18;
                  worksheet.addImage(avatarImageId, {
                    tl: { col: 0, row: 0 }, 
                    br: { col: 1, row: 4 },     
                    editAs: 'oneCell'
                  });
                }
              } catch (error) {
                console.error(error)
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
          labelCell.font = { name: "Helvetica", size: 12, bold: true };
          labelCell.value = label;
          labelCell.fill = { type: 'pattern',pattern: 'solid',fgColor: { argb: 'FFD9D9D9' }};
        
          worksheet.mergeCells(`D${row}:O${row}`);
          const valueCell = worksheet.getCell(`D${row}`);
          valueCell.font = { name: "Helvetica", size: 12 };
          valueCell.alignment = { vertical: 'middle', horizontal: 'left' };
          valueCell.value = value;
        });
        const baseRow = 7;
        let baseCol = 1;
        const headers = ['Hari', 'Tanggal', 'Masuk', 'Gambar Masuk', 'Pulang', 'Gambar Keluar', 'Durasi'];
        const columns = [
          { header: 'Hari', width: 13 },
          { header: 'Tanggal', width: 15 },
          { header: 'Masuk', width: 13 },
          { header: 'Gambar Masuk', width: 18 },
          { header: 'Pulang', width: 13 },
          { header: 'Gambar Keluar', width: 18 },
          { header: 'Durasi', width: 25 },
        ];

        for (const year in grouped_by_user[user_name]) {
          const monthKeys = Object.keys(grouped_by_user[user_name][year]);
          baseCol = 1;
          const monthCount = monthKeys.length;
          const totalColSpan = headers.length * monthCount + (monthCount - 1);
          worksheet.mergeCells(baseRow, baseCol, baseRow, baseCol + totalColSpan - 1);
          const year_cell = worksheet.getCell(baseRow, baseCol);
          year_cell.value = year;
          year_cell.alignment = { horizontal: 'center' };
          year_cell.font = { name: "Helvetica", size: 12, bold: true };
          year_cell.border = {
            top:    { style: 'thin' },
            left:   { style: 'thin' },
            bottom: { style: 'thin' },
            right:  { style: 'thin' }
          };

          for (const month of monthKeys) {
            const rows = grouped_by_user[user_name][year][month];
            worksheet.mergeCells(baseRow + 1, baseCol, baseRow + 1, baseCol + headers.length - 1);
            const title_cell = worksheet.getCell(baseRow + 1, baseCol);
            title_cell.value = `${month}`;
            title_cell.alignment = { horizontal: 'center' };
            title_cell.font = { name: "Helvetica", size: 12, bold: true };
            title_cell.border = {
              top:    { style: 'thin' },
              left:   { style: 'thin' },
              bottom: { style: 'thin' },
              right:  { style: 'thin' }
            };

            columns.forEach((col, i) => {
              const cell = worksheet.getCell(baseRow + 2, baseCol + i);
              cell.value = col.header;
              cell.font = { name: "Helvetica", size: 12, bold: true };
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD9D9D9' },
              };
              cell.border = {
                top:    { style: 'thin' },
                left:   { style: 'thin' },
                bottom: { style: 'thin' },
                right:  { style: 'thin' }
              };

              const worksheetCol = worksheet.getColumn(baseCol + i);
              worksheetCol.width = col.width === 'auto' ? col.header.length + 2 : col.width;
              worksheetCol.alignment = { horizontal: 'center', vertical: 'middle' };
            });

            let dailyIdx = 0;
            let total_duration = { hours: 0, minutes: 0, seconds: 0 };

            const sorted_dates = Object.keys(rows).sort();
            for (const date of sorted_dates) {
              const logs = rows[date];
              
              const login = logs.Login;
              const logout = logs.Logout;

              const row = baseRow + dailyIdx + 3;
            
              const loginTime = Object.keys(login).length != 0 ? DateTime.fromISO(login.created_at, { zone: 'Asia/Jakarta' }) : null;
              const logoutTime = Object.keys(logout).length != 0 ? DateTime.fromISO(logout.created_at, { zone: 'Asia/Jakarta' }) : null;
              let duration = "-"
              let formattedDuration = "-"
              if (loginTime && logoutTime){
                duration = logoutTime
                  ? logoutTime.diff(loginTime, ['hours', 'minutes', 'seconds']).toObject()
                  : null;
                total_duration = logoutTime ? {
                    hours: total_duration.hours + Math.floor(duration.hours),
                    minutes: total_duration.minutes + Math.floor(duration.minutes),
                    seconds: total_duration.seconds + Math.floor(duration.seconds),
                  } : total_duration;
                formattedDuration = duration
                    ? `${Math.floor(duration.hours)} jam ${Math.floor(duration.minutes)} menit ${Math.floor(duration.seconds)} detik`
                    : '-';
              }
            
              const hari = DateTime.fromISO(date, { zone: 'Asia/Jakarta' }).setLocale('ID').toFormat('cccc');
              const tanggal = date;
              const masuk = loginTime ? loginTime.toFormat("HH:mm:ss") : '-';
              const pulang = logoutTime ? logoutTime.toFormat("HH:mm:ss") : '-';
              const fillColor = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: {
                  argb: logoutTime && duration && Math.floor(duration.hours) >= 8
                    ? 'FF92D050' 
                    : 'FFFF0000'
                }
              };
              
              // ini data tulisan biasa
              fullRecapAddRow(worksheet, row, baseCol, hari, loginTime ? fillColor : undefined);
              fullRecapAddRow(worksheet, row, baseCol + 1, tanggal, loginTime ? fillColor : undefined);
              fullRecapAddRow(worksheet, row, baseCol + 2, masuk, loginTime ? fillColor : undefined);
              fullRecapAddRow(worksheet, row, baseCol + 4, pulang, loginTime ? fillColor : undefined);
              fullRecapAddRow(worksheet, row, baseCol + 6, formattedDuration, loginTime ? fillColor : undefined);

              // ini buat kolom gambar
              fullRecapAddRow(worksheet, row, baseCol + 3, '', loginTime ? fillColor : undefined);
              fullRecapAddRow(worksheet, row, baseCol + 5, '', loginTime ? fillColor : undefined);

              worksheet.getRow(row).height = 50; 
              if (login.image_path) {
                try {
                  const loginImgStream = await minio_client.getObject('log', login.image_path);
                  const loginImgBuffer = await streamToBuffer(loginImgStream);
                  if (loginImgBuffer) {
                    const loginImgId = workbook.addImage({
                      buffer: loginImgBuffer,
                      extension: 'jpg',
                    });
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

            const total_row = baseRow + dailyIdx + 3;

            total_duration.seconds %= 60;
            total_duration.minutes += Math.floor(total_duration.seconds / 60);
            total_duration.hours += Math.floor(total_duration.minutes / 60);
            const formattedTotal = `${total_duration.hours} jam ${total_duration.minutes} menit ${total_duration.seconds} detik`;
          
            const fillColor = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: {
                argb: total_duration.hours >= 160 ? 'FF92D050' : 'FFFF0000'
              }
            };
            worksheet.mergeCells(total_row, baseCol, total_row + 1, baseCol + 5);
            const labelCell = worksheet.getCell(total_row, baseCol + 5);
            labelCell.value = 'Total';
            labelCell.font = { bold: true };
            labelCell.alignment = { horizontal: 'center', vertical: 'middle' };
            labelCell.fill = fillColor;
            labelCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

            worksheet.mergeCells(total_row, baseCol + 6, total_row + 1, baseCol + 6);
            const totalCell = worksheet.getCell(total_row, baseCol + 6);
            totalCell.value = formattedTotal;
            totalCell.font = { bold: true };
            totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
            totalCell.fill = fillColor;
            totalCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

            baseCol += headers.length + 1;
          }
        }

        renderLegend(worksheet, "A45", "G45", "Keterangan: ", null);
        renderLegend(worksheet, "A46", "G46", "Jika baris berwarna merah, berarti pengguna ini belum memenuhi jam kerja.", { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } });
        renderLegend(worksheet, "A47", "G47", "Jika baris berwarna hijjau, berarti pengguna ini telah memenuhi jam kerja.", { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } });
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
