const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient();
exports.run = async () =>{
    await prisma.role.createMany({
        data: [
            {
                name: "Super Admin",
                guard_name: "super_admin",
                description: "This role can doing anything"
            },
            {
                name: "students",
                guard_name: "students",
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
        'presence_anywhere',
        'open_door_anywhere',
        'download_photo'
    ]
    await prisma.role.create({
        data: {
            name: "Admin",
            guard_name: "admin",
            description: "This role can doing anything about administrations",
            permission_role: {
                create: admin_role.map((permissionItems) => {
                    return {permission: {connect: {guard_name:permissionItems}}}
                })
            }
        }
    })
    const lecturePermission = [
        'user_get',
        'user_get_multi',
        'group_update',
        'group_get',
        'group_get_multi',
        'asign_user_to_group',
        'log_anywhere'
    ]
}