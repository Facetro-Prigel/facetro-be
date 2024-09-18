
const { PrismaClient } = require('@prisma/client')
const generator = require('../helper/generator');
const prisma = new PrismaClient()
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
        let isExist;
        isExist = await prisma.group.findMany({
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
        res.status(200).json({ data: isExist, code: 200 });
    },
    getter: async (req, res) => {
        var uuid = req.params.uuid;
        let isExist;
        isExist = await prisma.group.findUnique({
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
                usergroup: {
                    select: {
                        user: {
                            select: {
                                uuid: true,
                                name: true
                            }
                        }
                    }
                }
            },
        });

        res.status(200).json({ data: isExist, code: 200 });
    },
    
    insert: async (req, res) => {
        try {
            let result = await prisma.group.create({
                data: {
                    name: req.body.name,
                    locations: req.body.location,
                    users: {
                        connect: {
                            uuid: req.body.notifyTo
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
            return res.status(500).json({ error: "Terjadi kesalahan saat memproses permintaan" });
        }
        return res.status(200).json({ msg: "Grup sudah ditambahkan"});
    },
    deleter: async (req, res)=>{
        let uuid = req.params.uuid
        let check = await checkDeleteUpdate(uuid)
        if(!check){
            return res.status(400).json({ msg: "Grup tidak ditemukan"});
        }
        await prisma.group.delete({where: { uuid: uuid }})
        return res.status(200).json({ msg: "Grup berhasil dihapus"})
    },
    update: async(req, res)=>{
        let uuid = req.params.uuid
        let check = await checkDeleteUpdate(uuid)
        if(!check){
            return res.status(400).json({ msg: "Grup tidak ditemukan"});
        }
        try {
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
            if(req.body.notifyTo){
                data.users = {
                    connect: {
                        uuid: req.body.notifyTo
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
            return res.status(400).json({ error: "Terjadi kesalahan saat memproses permintaan" });
        }
        return res.status(200).json({ msg: "Grup berhasil ubah"})
    }
};
