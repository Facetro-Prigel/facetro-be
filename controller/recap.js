const { PrismaClient } = require('@prisma/client');
const { createResponse } = require("../helper/utils");
const ExcelJS = require('exceljs');
const path = require('path');
const utils = require('../helper/utils');
const { minio_client } = require('../minioClient'); // import minio client
const prisma = new PrismaClient();


const streamToBuffer = (stream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

module.exports = {
  getRecap: async (req, res) => {
    const columnWidths = {
      name: 0,
      identity_number: 0,
      device: 0,
      type: 0,
      in_time: 0,
      group: 0
    };

    try {
      let query = {
        where: {
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
        },
        orderBy: {
          created_at: 'desc'
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

      if (req.show_other_log) {
        delete query.where;
      }

      const attendanceData = await prisma.log.findMany(query);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Rekap Presensi');

      worksheet.columns = [
        { header: 'Photo', key: 'photo', width: 15 },
        { header: 'Name', key: 'name' },
        { header: 'Identity Number', key: 'identity_number' },
        { header: 'Presence In', key: 'device' },
        { header: 'Login/Logout', key: 'type' },
        { header: 'Waktu', key: 'in_time' },
        { header: 'Group', key: 'group' }
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF007BFF' }
        };
        cell.font = {
            color: { argb: 'FFFFFFFF' },
            bold: true
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      let rowIndex = 2;
      for (const entry of attendanceData) {
        const name = entry.user?.name || '';
        const identity_number = entry.user?.identity_number || '';
        const device = entry.device?.name || '';
        const type = entry.type || '';
        const in_time = new Date(entry.created_at).toLocaleString('id-ID');
        const group = entry.user?.user_group?.map(g => g.group.name).join(', ') || '';

        const row = worksheet.addRow({ name, identity_number, device, type, in_time, group });
        worksheet.getRow(rowIndex).height = 60;

        row.eachCell((cell) => {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        columnWidths.name = Math.max(columnWidths.name, name.length);
        columnWidths.identity_number = Math.max(columnWidths.identity_number, identity_number.length);
        columnWidths.device = Math.max(columnWidths.device, device.length);
        columnWidths.type = Math.max(columnWidths.type, type.length);
        columnWidths.in_time = Math.max(columnWidths.in_time, in_time.length);
        columnWidths.group = Math.max(columnWidths.group, group.length);

        if (entry.image_path) {
          try {
            let imageBuffer = null;
            try {
              const stream = await minio_client.getObject('log', entry.image_path);
              imageBuffer = await streamToBuffer(stream);
            }catch (err) {
              console.warn(`Gagal mengambil gambar dari MinIO ${entry.image_path}:`, err.message);
            }

            const imageId = workbook.addImage({buffer: imageBuffer, extension: path.extname(entry.image_path).slice(1) || 'jpeg'});

            worksheet.addImage(imageId, {
                tl: { col: 0 + (1 - 80 / (15 * 7.5)) / 2, row: rowIndex - 1 },
                ext: { width: 80, height: 80 }
            });

          } catch (err) {
              console.warn(`Gagal mengambil gambar dari MinIO ${entry.image_path}:`, err.message);
          }
        }

        rowIndex++;
      }

      worksheet.getColumn('name').width = columnWidths.name + 2;
      worksheet.getColumn('identity_number').width = columnWidths.identity_number + 2;
      worksheet.getColumn('device').width = columnWidths.device + 2;
      worksheet.getColumn('type').width = columnWidths.type + 2;
      worksheet.getColumn('in_time').width = columnWidths.in_time + 2;
      worksheet.getColumn('group').width = columnWidths.group + 2;

      let buffer = await workbook.xlsx.writeBuffer();
      const base64file = buffer.toString('base64');

      return createResponse(res, 200, "Success", "Rekap Presensi berhasil diunduh", `/recap`, { file: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64file}` });
    } catch (error) {
      console.error('XLSX Export Error:', error);
      utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/recap`);
    }
  }
};
