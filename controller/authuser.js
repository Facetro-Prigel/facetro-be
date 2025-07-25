const { PrismaClient } = require("@prisma/client");
const generator = require("../helper/generator");
const genPass = require('../helper/generator');
const utils = require('../helper/utils');
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();
const metadata = require('gcp-metadata')
const { OAuth2Client } = require('google-auth-library');
const oAuth2Client = new OAuth2Client();
require('dotenv').config();

module.exports = {
  change_password: async (req, res) => {
    const uuid = req.user.uuid
    const { old_password, new_password } = req.body;

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
        role_user: {
            select: {
                role: {
                  select:{
                    name: true,
                    guard_name: true,
                    permission_role:{
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
    let ResultPassword = false
    if(results){
      ResultPassword = await bcrypt.compare(
        req.body.password,
        results.password
      );
    }
    if (!ResultPassword) {
      return utils.createResponse(res, 401, "Unauthorized", "Ada yang salah dengan email dan/atau password, silahkan coba lagi!", "/user/login"); 
    }
    let user_roles = []
    let user_permission = []
    for (const ite of results.role_user) {
      user_roles.push(ite.role.name)
      let permission = ite.role.permission_role
      if(ite.role.guard_name == 'super_admin'){
        permission = await prisma.permission.findMany()
      }
      for (const iter of permission) {
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
      { uuid: results.uuid, identity_number: results.identity_number, email: results.email, name: results.name},
      process.env.SECRET_TOKEN
    );
    return utils.createResponse(res, 200, "Success", "Login berhasil!", "/user/login", { token: token, name: results.name, uuid: results.uuid, avatar: results.avatar, bbox: results.bbox, user_roles:user_roles, user_permission: user_permission});
  },
  googleLogin: async (req, res) => {
    const { credential } = req.body;
    if (!credential) {
      return utils.createResponse(res, 400, "Bad Request", "Mohon pilih email yang mau digunakan!", "/user/google-login");
    }

    try {
      const ticket = await oAuth2Client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      const email = payload.email;

      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          role_user: {
            include: {
              role: {
                include: {
                  permission_role: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
          permission_user: {
            include: {
              permission: true,
            },
          },
        },
      });

      if (!user) {
        return utils.createResponse(res, 404, "Not Found", "Mohon hubungi admin terlebih dahulu untuk membuat akun!", "/user/google-login");
      }

      const user_roles = [];
      const user_permission = [];

      for (const roleUser of user.role_user) {
        const role = roleUser.role;
        user_roles.push(role.guard_name);

        let permissions = role.permission_role;

        if (role.guard_name === "super_admin") {
          permissions = await prisma.permission.findMany();
          for (const perm of permissions) {
            user_permission.push(perm.guard_name);
          }
        } else {
          for (const pr of permissions) {
            user_permission.push(pr.permission.guard_name);
          }
        }
      }

      for (const pu of user.permission_user) {
        user_permission.push(pu.permission.guard_name);
      }

      const token = generator.generateAccessToken(
        {
          uuid: user.uuid,
          email: user.email,
          name: user.name,
        },
        process.env.SECRET_TOKEN
      );

      return utils.createResponse(res, 200, "Success", "Login berhasil!", "/user/auth/google",{ token: token, name: user.name, uuid: user.uuid, avatar: user.avatar, bbox: user.bbox, user_roles:user_roles, user_permission: user_permission});
    } catch (error) {
      console.error("Error verifying token: ", error);
      return utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan pada server!", "/user/auth/google");
    }
  }
};
