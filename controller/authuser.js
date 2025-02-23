const { PrismaClient } = require("@prisma/client");
const generator = require("../helper/generator");
const genPass = require('../helper/generator');
const utils = require('../helper/utils');
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();
const metadata = require('gcp-metadata');
const {OAuth2Client} = require('google-auth-library');
const { message } = require("telegraf/filters");

const oAuth2Client = new OAuth2Client();
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;       // Pastikan sudah disetting di .env

module.exports = {
  change_password: async (req, res) => {
    const { uuid, old_password, new_password } = req.body;

    if (!uuid || !old_password || !new_password) {
      return res.status(400).json(utils.createResponse(400, "Bad Request", "Semua field (password lama, password baru) harus diisi!", "/user/change-password"));
    }
  
    try {
      const user = await prisma.user.findUnique({
        where: {uuid: uuid}
      });
  
      if (!user) {
        return res.status(404).json(utils.createResponse(404, "Not Found", "User tidak ditemukan!", "/user/change-password"));
      }
  
      const isOldPasswordValid = await bcrypt.compare(old_password, user.password);
      if (!isOldPasswordValid) {
        return res.status(403).json(utils.createResponse(403, "Forbidden", "Password lama salah, coba lagi!", "/user/change-password"));
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[&%$])[A-Za-z\d&%$]{6,}$/;
      if (!passwordRegex.test(new_password)) {
        return res.status(400).json(utils.createResponse(400, "Bad Request", "Password baru harus memiliki minimal 6 karakter, terdiri dari huruf besar, huruf kecil, angka, dan karakter khusus!", "/user/change-password"));
      }
  
      await prisma.user.update({
        where: {
          uuid: uuid
        },
        data: {
          password: await genPass.generatePassword(new_password)
        }
      });
  
      return res.status(200).json(utils.createResponse(200, "Success", "Password berhasil diubah!", "/user/change-password"));
    } catch (error) {
      console.error(error);
      return res.status(500).json(utils.createResponse(500, "Internal Server Error", "Terjadi kesalahan pada server!", "/user/change-password"));
    }
  },
  login: async (req, res) => {
    if (!req.body.email || !req.body.password) {
      return res.status(400).json(utils.createResponse(400, "Bad Request", "Semua field (email, password) harus diisi!", "/user/login"));
    }
    const results = await prisma.user.findUnique({
      where: {
        email: req.body.email,
      },
      include: {
        role_user: {
            select: {
                role: {
                  select:{
                    guard_name: true,
                    permissionrole:{
                      select:{
                        permission:{
                          select:{
                            guard_name: true
                          }
                        }
                      }
                    }
                  }
                }

            }
        },
        permission_user: {
          select: {
              permission: {
                select:{
                  guard_name:true
                }
              }
          }
      },
      }
    });
    if (!results) {
      return res.status(401).json(utils.createResponse(401, "Unauthorized", "Ada yang salah dengan email atau password, silahkan coba lagi!", "/user/login"));
    }
    let ResultPassword = await bcrypt.compare(
      req.body.password,
      results.password
    );
    if (!ResultPassword) {
      return res.status(401).json(utils.createResponse(401, "Unauthorized", "Ada yang salah dengan email atau password, silahkan coba lagi!", "/user/login"));
    }
    let user_roles = []
    let user_permission = []
    for (const ite of results.role_user) {
      user_roles.push(ite.role.guard_name)
      let permissions = ite.role.permission_role
      if(ite.role.guard_name == 'super_admin'){
        permissions = await prisma.permission.findMany()
      }
      for (const iter of permissions) {
        if(ite.role.guard_name == 'super_admin'){
          user_permission.push(iter.guard_name)
        }else{
          user_permission.push(iter.permission.guard_name)
        }
      }
    }
    for (const itera of results.permission_user) {
      user_permission.push(itera.permission.guard_name)
    }
    let token = generator.generateAccessToken(
      { uuid: results.uuid, email: results.email, name: results.name},
      process.env.SECRET_TOKEN
    );
    return res.json({ token: token, name: results.name, uuid: results.uuid, avatar: results.avatar, bbox: results.bbox, user_roles:user_roles, user_permission: user_permission});
  }
};
