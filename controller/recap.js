const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');
const axios = require('axios');
const path = require('path');
const utils = require('../helper/utils');
const prisma = new PrismaClient();

const hasPermission = (user, guardName) => {
  const permissionsFromRoles = user.role_user.flatMap(roleUser =>
    roleUser.role.permission_role.map(pr => pr.permission.guard_name)
  );

  const directPermissions = user.permission_user.map(pu => pu.permission.guard_name);

  const allPermissions = new Set([...permissionsFromRoles, ...directPermissions]);

  return allPermissions.has(guardName);
};

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
        orderBy: { created_at: 'desc' },
        select: {
          is_match: true,
          image_path: true,
          bbox: true,
          type: true,
          created_at: true,
          device: { select: { name: true, uuid: true } },
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
          }
        }
      };

      const user = await prisma.user.findUnique({
        where: { uuid: req.user.uuid },
        include: {
          role_user: {
            include: {
              role: {
                include: {
                  permission_role: { include: { permission: true } }
                }
              }
            }
          },
          permission_user: { include: { permission: true } },
          user_group: {
            include: {
              group: {
                include: {
                  door_group: {
                    include: { device: true }
                  }
                }
              }
            }
          }
        }
      });

      if (!hasPermission(user, "export_all_recap") && !hasPermission(user, "export_some_recap")) {
        return utils.createResponse(res, 403, "Forbidden", "Anda tidak memiliki izin untuk mengakses data ini", `/recap`);
      }

      if (hasPermission(user, "export_some_recap")) {
        const groupIds = user.user_group?.map(ug => ug.group?.uuid).filter(Boolean) || [];

        if (groupIds.length == 0) {
          return utils.createResponse(res, 404, "Not Found", "Tidak ada grup yang bisa direkap", `/recap`);
        }
        
        query.where = {
          user: {
            user_group: {
              some: {
                group: { 
                  uuid: { in: groupIds } 
                }
              }
            }
          }
        };
        
        
      }

      const attendanceData = await prisma.log.findMany(query);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Rekap Presensi');

      worksheet.columns = [
        { header: 'Photo', key: 'photo', width: 15 },
        { header: 'Name', key: 'name' },
        { header: 'Identity Number', key: 'identity_number' },
        { header: 'Presence/Open Door In', key: 'device' },
        { header: 'Presence/Door', key: 'type' },
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
            const imageUrl = `http://localhost:${process.env.PORT}/photos/${entry.image_path}`;
            const imageResp = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                headers: {
                  Origin: `http://localhost:${process.env.PORT || 3000}`,
                  Referer: `http://localhost:${process.env.PORT || 3000}/recap`
                }
              });
      
            const imageId = workbook.addImage({
              buffer: imageResp.data,
              extension: path.extname(entry.image_path).slice(1) || 'jpeg'
            });
      
            worksheet.addImage(imageId, {
                tl: { col: 0 + (1 - 80 / (15 * 7.5)) / 2, row: rowIndex - 1 },
                ext: { width: 80, height: 80 }
            });
      
          } catch (err) {
            console.warn(`Gagal mengambil gambar ${entry.image_path}:`, err.message);
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

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=rekap-presensi.xlsx');
      res.send(buffer);

    } catch (error) {
      console.error('XLSX Export Error:', error);
      utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/recap`);
    }
  }
};
