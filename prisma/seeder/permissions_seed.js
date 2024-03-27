const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient();
exports.run = async () =>{
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
}