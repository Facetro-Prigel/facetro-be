const { PrismaClient } = require("@prisma/client");
const generator = require("../helper/generator");
const genPass = require('../helper/generator');
const utils = require('../helper/utils');
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();
require('dotenv').config();

module.exports = {
  change_password: async (req, res) => {
    const { uuid, old_password, new_password } = req.body;

    if (!uuid || !old_password || !new_password) {
      return utils.createResponse(res, 400, "Bad Request", "Semua field (uuid, password lama, password baru) harus diisi!", "/user/change-password");
    }
  
    try {
      const user = await prisma.user.findUnique({
        where: {uuid: uuid}
      });
  
      if (!user) {
        return utils.createResponse(res, 404, "Not Found", "User tidak ditemukan!", "/user/change-password");
      }
  
      const isOldPasswordValid = await bcrypt.compare(old_password, user.password);
      if (!isOldPasswordValid) {
        return utils.createResponse(res, 403, "Forbidden", "Password lama salah, coba lagi!", "/user/change-password"); 
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[&%$])[A-Za-z\d&%$]{6,}$/;
      if (!passwordRegex.test(new_password)) {
        return utils.createResponse(res, 400, "Bad Request", "Password baru harus memiliki minimal 6 karakter, terdiri dari huruf besar, huruf kecil, angka, dan karakter khusus!", "/user/change-password"); 
      }
  
      await prisma.user.update({
        where: {
          uuid: uuid
        },
        data: {
          password: await genPass.generatePassword(new_password)
        }
      });
  
      return utils.createResponse(res, 200, "Success", "Password berhasil diubah!", "/user/change-password"); 
    } catch (error) {
      console.error(error);
      return utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan pada server!", "/user/change-password"); 
    }
  },
  login: async (req, res) => {
    if (!req.body.email || !req.body.password) {
      return utils.createResponse(res, 400, "Bad Request", "Semua field (email, password) harus diisi!", "/user/login"); 
    }
    const results = await prisma.user.findUnique({
      where: {
        email: req.body.email,
      },
      include: {
        roleuser: {
            select: {
                role: {
                  select:{
                    guardName: true,
                    permisionrole:{
                      select:{
                        permission:{
                          select:{
                            guardName: true
                          }
                        }
                      }
                    }
                  }
                }

            }
        },
        permissionUser: {
          select: {
              permission: {
                select:{
                  guardName:true
                }
              }
          }
      },
      }
    });
    if (!results) {
      return utils.createResponse(res, 404, "Not Found", "Silakan hubungi Admin untuk melakukan pendaftaran!", "/user/login"); 
    }
    let ResultPassword = await bcrypt.compare(
      req.body.password,
      results.password
    );
    if (!ResultPassword) {
      return utils.createResponse(res, 401, "Unauthorized", "Ada yang salah dengan email atau password, silahkan coba lagi!", "/user/login"); 
    }
    let user_roles = []
    let user_permission = []
    for (const ite of results.roleuser) {
      user_roles.push(ite.role.guardName)
      let permisions = ite.role.permisionrole
      if(ite.role.guardName == 'super_admin'){
        permisions = await prisma.permission.findMany()
      }
      for (const iter of permisions) {
        if(ite.role.guardName == 'super_admin'){
          user_permission.push(iter.guardName)
        }else{
          user_permission.push(iter.permission.guardName)
        }
      }
    }
    for (const itera of results.permissionUser) {
      user_permission.push(itera.permission.guardName)
    }
    let token = generator.generateAccessToken(
      { uuid: results.uuid, email: results.email, name: results.name},
      process.env.SECRET_TOKEN
    );
    console.log(JSON.stringify(results.uuid));
    return utils.createResponse(res, 200, "Success", "Login berhasil!", "/user/login", { token: token, name: results.name, uuid: results.uuid, avatar: results.avatar, bbox: results.bbox, user_roles:user_roles, user_permission: user_permission});
  }
};
