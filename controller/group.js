
const { PrismaClient } = require('@prisma/client')
const generator = require('../helper/generator');
const prisma = new PrismaClient()
const utils = require('../helper/utils')
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
        let is_exist;
        try {
            is_exist = await prisma.group.findMany({
                select: {
                    uuid: true,
                    name: true,
                    locations: true,
                    device: {
                        select: {
                            name: true,
                            locations: true
                        },
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
            return res.status(500).json(utils.createResponse(500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", "/group"));
        }
        res.status(200).json(utils.createResponse(200, "Success", "Grup berhasil ditemukan", "/group", is_exist));
    },
    getter: async (req, res) => {
        let is_exist;
        try {
            var uuid = req.params.uuid;
            is_exist = await prisma.group.findUnique({
                where: { uuid: uuid },
                select: {
                    name: true,
                    locations: true,
                    device: {
                        select: {
                            uuid: true,
                            name: true,
                            locations: true
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
            console.error("Error while inserting group:", error);
            return res.status(500).json(utils.createResponse(500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/group/${uuid}`));
        }
        res.status(200).json(utils.createResponse(200, "Success", "Grup berhasil ditemukan", `/group/${uuid}`, is_exist));
    },
    
    insert: async (req, res) => {
        try {
            let result = await prisma.group.create({
                data: {
                    name: req.body.name,
                    locations: req.body.location,
                    users: {
                        connect: {
                            uuid: req.body.notify_to
                        }
                    },
                    device: {
                        connect: {
                            uuid: req.body.device
                        }
                    }
                }
            })
        } catch (error) {
            console.error("Error while inserting group:", error);
            return res.status(500).json(utils.createResponse(500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", "/group"));
        }
        utils.webSockerUpdate(req)
        return res.status(200).json(utils.createResponse(200, "Success", "Grup berhasil ditambahkan", "/group"));

    },
    deleter: async (req, res)=>{
        let uuid = req.params.uuid
        try {
            let check = await checkDeleteUpdate(uuid)
            if(!check){
                return res.status(404).json(utils.createResponse(404, "Not Found", "Grup tidak ditemukan", `/group/${uuid}`));
            }
            await prisma.group.delete({where: { uuid: uuid }})
        } catch (error) {
            console.error("Error while inserting group:", error);
            return res.status(500).json(utils.createResponse(500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/group/${uuid}`));
        }
        utils.webSockerUpdate(req)
        return res.status(200).json(utils.createResponse(200, "Success", "Grup berhasil dihapus", `/group/${uuid}`));
    },
    update: async(req, res)=>{
        let uuid = req.params.uuid
        try {
            let check = await checkDeleteUpdate(uuid)
            if(!check){
                return res.status(404).json(utils.createResponse(404, "Not Found", "Grup tidak ditemukan", `/group/${uuid}`));
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
            let result = await prisma.group.update({
                where:{
                    uuid: uuid
                },
                data: data
            })
        } catch (error) {
            console.error("Error while inserting group:", error);
            return res.status(500).json(utils.createResponse(500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/group/${uuid}`));
        }
        utils.webSockerUpdate(req)
        return res.status(200).json(utils.createResponse(200, "Success", "Grup berhasil diperbarui", `/group/${uuid}`));
    }
};
