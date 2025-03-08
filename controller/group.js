
const { PrismaClient } = require('@prisma/client')
const generator = require('../helper/generator');
const prisma = new PrismaClient()
const utils = require('../helper/utils');
const device = require('./device');
const checkDeleteUpdate = async (uuid, reqs) => {
    const user = await prisma.group.findUnique({
      where: {
        uuid: uuid
      },
      select: {
        name: true,
      }
    });
    return user
  }
module.exports = {
    getter_all: async (req, res) => {
        let groups;
        try {
            groups = await prisma.group.findMany({
                select: {
                    uuid: true,
                    name: true,
                    locations: true,
                    door_group:{
                        select:{
                            device:{
                                select:{
                                    name:true
                                }
                            }
                        }
                    },
                    presence_group:{
                        select:{
                            device:{
                                select:{
                                    name:true
                                }
                            }
                        }
                    },
                    users: {
                        select: {
                            name: true,
                            avatar:true,
                            bbox:true
                        },
                    },
                },
            });
        } catch (error) {
            console.error("Error while inserting group:", error);
            return utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", "/group");
        }
        return utils.createResponse(res, 200, "Success", "Grup berhasil ditemukan", "/group", groups);
    },
    getter: async (req, res) => {
        let group;
        let uuid = req.params.uuid;
        try {
            group = await prisma.group.findUnique({
                where: { uuid: uuid },
                select: {
                    name: true,
                    locations: true,
                    presence_group: {
                        select: {
                            device: {
                                select:{
                                    name:true,
                                    uuid:true
                                }
                            },
                        },
                    },
                    door_group: {
                        select: {
                            device: {
                                select:{
                                    name:true,
                                    uuid:true
                                }
                            },
                        },
                    },
                    users: {
                        select: {
                            uuid: true,
                            name: true
                        },
                    },
                    user_group: {
                        select: {
                            user: {
                                select: {
                                    uuid: true,
                                    name: true,
                                    avatar:true
                                }
                            }
                        }
                    }
                },
            });
        } catch (error) {
            console.error("Error while getting group:", error);
            return utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/group/${uuid}`);
        }
        return utils.createResponse(res, 200, "Success", "Grup berhasil ditemukan", `/group/${uuid}`, group);
    },
    
    insert: async (req, res) => {
        try {
            await prisma.group.create({
                data: {
                    name: req.body.name,
                    locations: req.body.location,
                    users: {
                        connect: {
                            uuid: req.body.notify_to
                        }
                    },
                    presence_group:{
                        create: req.body.presence_device.map((projectItems) => {
                            if (projectItems != "") {
                              return { device: { connect: { uuid: projectItems } } }
                            }
                          })
                    },
                    door_group:{
                        create: req.body.door_device.map((projectItems) => {
                            if (projectItems != "") {
                              return { device: { connect: { uuid: projectItems } } }
                            }
                          })
                    },
                }
            })
        } catch (error) {
            console.error("Error while inserting group:", error);
            return utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", "/group");
        }
        utils.webSockerUpdate(req)
        return utils.createResponse(res, 200, "Success", "Grup berhasil ditambahkan", "/group");
    },
    deleter: async (req, res)=>{
        let uuid = req.params.uuid
        try {
            let check = await checkDeleteUpdate(uuid)
            if(!check){
                return utils.createResponse(res, 404, "Not Found", "Grup tidak ditemukan", `/group/${uuid}`);
            }
            await prisma.group.delete({where: { uuid: uuid }})
        } catch (error) {
            console.error("Error while inserting group:", error);
            return utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/group/${uuid}`);
        }
        utils.webSockerUpdate(req)
        return utils.createResponse(res, 200, "Success", "Grup berhasil dihapus", `/group/${uuid}`);
    },
    update: async(req, res)=>{
        let uuid = req.params.uuid
        try {
            let check = await checkDeleteUpdate(uuid)
            if(!check){
                return utils.createResponse(res, 404, "Not Found", "Grup tidak ditemukan", `/group/${uuid}`);
            }
            let data ={
                name: req.body.name,
                locations: req.body.location,
            } 
            if(req.body.device){
                data.device =  {
                    connect: {
                        uuid: req.body.device
                    }
                }
            }
            if(req.body.notify_to){
                data.users = {
                    connect: {
                        uuid: req.body.notify_to
                    }
                }
            }
            await prisma.group.update({
                where:{
                    uuid: uuid
                },
                data: data
            })
        } catch (error) {
            console.error("Error while inserting group:", error);
            return utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/group/${uuid}`);
        }
        utils.webSockerUpdate(req)
        return utils.createResponse(res, 200, "Success", "Grup berhasil diupdate", `/group/${uuid}`);
    }
};
