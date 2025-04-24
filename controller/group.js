
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
            let query =
            {
                where: {
                    notify_to: req.user.uuid
                },
                select: {
                    uuid: true,
                    name: true,
                    locations: true,
                    door_group: {
                        select: {
                            device: {
                                select: {
                                    name: true
                                }
                            }
                        }
                    },
                    presence_group: {
                        select: {
                            device: {
                                select: {
                                    name: true
                                }
                            }
                        }
                    },
                    users: {
                        select: {
                            name: true,
                            avatar: true,
                            bbox: true
                        },
                    },
                },
            }
            if(req.get_all_group){
                delete query.where
            }
            groups = await prisma.group.findMany(query);
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
                                select: {
                                    name: true,
                                    uuid: true
                                }
                            },
                        },
                    },
                    door_group: {
                        select: {
                            device: {
                                select: {
                                    name: true,
                                    uuid: true
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
                                    avatar: true
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

            let data
            data = {
                data: {
                    name: req.body.name,
                    locations: req.body.locations,
                    users: {
                        connect: {
                            uuid: req.body.users
                        }
                    }
                }
            }
            if (req.body.door_device) {
                data.data.door_group = {
                    create: req.body.door_device.map((projectItems) => {
                        if (projectItems != "") {
                            return { device: { connect: { uuid: projectItems } } }
                        }
                    })
                }
            }
            if (req.body.presence_device) {
                data.data.presence_group = {
                    create: req.body.presence_device.map((projectItems) => {
                        if (projectItems != "") {
                            return { device: { connect: { uuid: projectItems } } }
                        }
                    })
                }
            }
            await prisma.group.create(data)
        } catch (error) {
            console.error("Error while inserting group:", error);
            return utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", "/group");
        }
        utils.webSockerUpdate(req)
        return utils.createResponse(res, 200, "Success", "Grup berhasil ditambahkan", "/group");
    },
    deleter: async (req, res) => {
        let uuid = req.params.uuid
        try {
            let check = await checkDeleteUpdate(uuid)
            if (!check) {
                return utils.createResponse(res, 404, "Not Found", "Grup tidak ditemukan", `/group/${uuid}`);
            }
            await prisma.group.delete({ where: { uuid: uuid } })
        } catch (error) {
            console.error("Error while inserting group:", error);
            return utils.createResponse(res, 500, "Internal Server Error", "Terjadi kesalahan saat memproses permintaan", `/group/${uuid}`);
        }
        utils.webSockerUpdate(req)
        return utils.createResponse(res, 200, "Success", "Grup berhasil dihapus", `/group/${uuid}`);
    },
    update: async (req, res) => {
        let uuid = req.params.uuid
        try {
            let check = await checkDeleteUpdate(uuid)
            if (!check) {
                return utils.createResponse(res, 404, "Not Found", "Grup tidak ditemukan", `/group/${uuid}`);
            }
            let data = {
                name: req.body.name,
                locations: req.body.locations,
            }
            if (req.body.users) {
                data.users = {
                    connect: {
                        uuid: req.body.users
                    }
                }
            }
            if (req.body.door_device) {
                await prisma.doorGroup.deleteMany({
                    where: { group_uuid: uuid }
                })
                data.door_group = {
                    create: req.body.door_device.map((projectItems) => {
                        if (projectItems != "") {
                            return { device: { connect: { uuid: projectItems } } }
                        }
                    })
                }
            }
            if (req.body.presence_device) {
                await prisma.presenceGroup.deleteMany({
                    where: { group_uuid: uuid }
                })
                data.presence_group = {
                    create: req.body.presence_device.map((projectItems) => {
                        if (projectItems != "") {
                            return { device: { connect: { uuid: projectItems } } }
                        }
                    })
                }
            }
            await prisma.group.update({
                where: {
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
