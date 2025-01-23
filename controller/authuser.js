const { PrismaClient } = require("@prisma/client");
const generator = require("../helper/generator");
const genPass = require('../helper/generator');
const utils = require('../helper/utils');
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();
require('dotenv').config();

module.exports = {
  login: async (req, res) => {
    if (!req.body.email || !req.body.password) {
      return res.status(400).json({ msg: "Masukan Email atau Password " });
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
      return res.status(404).json({ msg: "Email Tidak Di temukan" });
    }
    let ResultPassword = await bcrypt.compare(
      req.body.password,
      results.password
    );
    if (!ResultPassword) {
      return res.status(404).json({ msg: "Password salah" });
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
    return res.json({ token: token, name: results.name, uuid: results.uuid, avatar: results.avatar, bbox: results.bbox, user_roles:user_roles, user_permission: user_permission});
  }
};
