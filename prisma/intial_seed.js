const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt');
const prisma = new PrismaClient()
const generatePassword = async (password) =>{
    const salt = await bcrypt.genSalt(14);
    return await bcrypt.hash(password, salt);
}
const main = async () => {
    //Permissions
    const permissions_seed = await prisma.permission.createMany({
        data: [
            {
                name: "Can Create User",
                guardName: "user_create",
                description: "This Role/User can create another user."
            },
            {
                name: "Can Update User",
                guardName: "user_update",
                description: "This Role/User can updating another user."
            },
            {
                name: "Can Delete User",
                guardName: "user_delete",
                description: "This Role/User can deleting another user."
            },
            {
                name: "Can Get User",
                guardName: "user_get",
                description: "This Role/User can get general information of single user."
            },
            {
                name: "Can Get Multiple User ",
                guardName: "user_get_multi",
                description: "This Role/User can get general information of multi user."
            },

            {
                name: "Can Get Multiple Device ",
                guardName: "device_get_multi",
                description: "This Role/User can get  information of multi Device."
            },
            {
                name: "Can Get Device",
                guardName: "device_get",
                description: "his Role/User can get general information of single Device."
            },
            {
                name: "Can Delete Device",
                guardName: "device_delete",
                description: "This Role/User can deleting another Device."
            },
            {
                name: "Can Update Device",
                guardName: "Device_update",
                description: "This Role/User can updating another Device."
            },
            {
                name: "Can Create Device",
                guardName: "device_create",
                description: "This Role/User can create another Device."
            },

            {
                name: "Can Create Role",
                guardName: "role_create",
                description: "This Role/User can create another Role."
            },
            {
                name: "Can Update Role",
                guardName: "role_update",
                description: "This Role/User can update another Role."
            },
            {
                name: "Can Delete Role",
                guardName: "role_delete",
                description: "This Role/User can delete another Role."
            },
            {
                name: "Can Get Role",
                guardName: "role_get",
                description: "This Role/User can get general information of a single Role."
            },
            {
                name: "Can Get Multiple Roles",
                guardName: "role_get_multi",
                description: "This Role/User can get general information of multiple Roles."
            },

            {
                name: "Can Create Group",
                guardName: "group_create",
                description: "This Role/User can create another Group."
            },
            {
                name: "Can Update Group",
                guardName: "group_update",
                description: "This Role/User can update another Group."
            },
            {
                name: "Can Delete Group",
                guardName: "group_delete",
                description: "This Role/User can delete another Group."
            },
            {
                name: "Can Get Group",
                guardName: "group_get",
                description: "This Role/User can get general information of a single Group."
            },
            {
                name: "Can Get Multiple Groups",
                guardName: "group_get_multi",
                description: "This Role/User can get general information of multiple Groups."
            },

            {
                name: "Can Asign User To Group",
                guardName: "asign_user_to_group",
                description: "This Task can Asign User To Group"
            },
            {
                name: "Can Asign User To Permision",
                guardName: "asign_user_to_permision",
                description: "This Task can Asign User To Permision"
            },
            {
                name: "Can Asign User To Role",
                guardName: "asign_user_to_role",
                description: "This Task can Asign User To Role"
            },
            {
                name: "Can Asign Role To Permision",
                guardName: "asign_role_to_permision",
                description: "This Task can Asign Role To permision"
            },

            {
                name: "Log Update",
                guardName: "log_update",
                description: "Log Has Been Updated"
            },
            {
                name: "Log Delete",
                guardName: "log_delete",
                description: "Log Has Been Deleted"
            },
            {
                name: "Log Anywhere",
                guardName: "log_anywhere",
                description: "This User Can Absent On Any Device."
            },
            {
                name: "Download Photo",
                guardName: "download_photo",
                description: "This Role/User Can Download Photo From Log ."
            }
        ]
    })

    //Role
    await prisma.role.createMany({
        data: [
            {
                name: "Super Admin",
                guardName: "super_admin",
                description: "This role can doing anything"
            },
            {
                name: "students",
                guardName: "students",
                description: ""
            }
        ]
    })
    const admin_role = [
        'user_create',
        'user_update',
        'user_delete',
        'user_get',
        'user_get_multi',
        'device_create',
        'device_update',
        'device_delete',
        'device_get',
        'device_get_multi',
        'role_create',
        'role_update',
        'role_delete',
        'role_get',
        'role_get_multi',
        'group_create',
        'group_update',
        'group_delete',
        'group_get',
        'group_get_multi',
        'asign_user_to_group',
        'asign_user_to_permision',
        'asign_user_to_role',
        'asign_role_to_permision',
        'log_anywhere',
        'download_photo'
    ]
    await prisma.role.create({
        data: {
            name: "Admin",
            guardName: "admin",
            description: "This role can doing anything about administrations",
            permisionrole: {
                create: admin_role.map((permissionItems) => {
                    return {permission: {connect: {guardName:permissionItems}}}
                })
            }
        }
    })
    const lecturePermission = [
        // User
        'user_get',
        'user_get_multi',
        // Group
        'group_update',
        'group_get',
        'group_get_multi',
        // Asign
        'asign_user_to_group',
        'log_anywhere'
    ]
    await prisma.role.create({
        data: {
            name: "lecture",
            guardName: "lecture",
            description: "",
            permisionrole: {
                create: lecturePermission.map((permissionItems) => {
                    return {permission: {connect: {guardName:permissionItems}}}
                })
            }
        }
    })

    //User
    const user_seed = await prisma.user.create({
        data:
        {
            name: "Muhammad Iqbal",
            identityNumber: "5312421026",
            password: await generatePassword("Leb4hG@nt3ng"),
            email: "xmod3905@students.unnes.ac.id",
            roleuser: {
                create: {
                    role: {
                        connect: {
                            guardName: 'super_admin',
                        }
                    }
                }
            }
        }
    })

}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })