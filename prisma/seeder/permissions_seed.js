const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient();
exports.run = async () =>{
    const permissions_seed = await prisma.permission.createMany({
        data: [
            {
                name: "Can Create User",
                guard_name: "user_create",
                description: "This Role/User can create another user."
            },
            {
                name: "Can Update User",
                guard_name: "user_update",
                description: "This Role/User can updating another user."
            },
            {
                name: "Can Delete User",
                guard_name: "user_delete",
                description: "This Role/User can deleting another user."
            },
            {
                name: "Can Get User",
                guard_name: "user_get",
                description: "This Role/User can get general information of single user."
            },
            {
                name: "Can Get Multiple User ",
                guard_name: "user_get_multi",
                description: "This Role/User can get general information of multi user."
            },
    
            {
                name: "Can Get Multiple Device ",
                guard_name: "device_get_multi",
                description: "This Role/User can get  information of multi Device."
            },
            {
                name: "Can Get Device",
                guard_name: "device_get",
                description: "his Role/User can get general information of single Device."
            },
            {
                name: "Can Delete Device",
                guard_name: "device_delete",
                description: "This Role/User can deleting another Device."
            },
            {
                name: "Can Update Device",
                guard_name: "device_update",
                description: "This Role/User can updating another Device."
            },
            {
                name: "Can Create Device",
                guard_name: "device_create",
                description: "This Role/User can create another Device."
            },
    
            {
                name: "Can Create Role",
                guard_name: "role_create",
                description: "This Role/User can create another Role."
            },
            {
                name: "Can Update Role",
                guard_name: "role_update",
                description: "This Role/User can update another Role."
            },
            {
                name: "Can Delete Role",
                guard_name: "role_delete",
                description: "This Role/User can delete another Role."
            },
            {
                name: "Can Get Role",
                guard_name: "role_get",
                description: "This Role/User can get general information of a single Role."
            },
            {
                name: "Can Get Multiple Roles",
                guard_name: "role_get_multi",
                description: "This Role/User can get general information of multiple Roles."
            },
    
            {
                name: "Can Create Group",
                guard_name: "group_create",
                description: "This Role/User can create another Group."
            },
            {
                name: "Can Update Group",
                guard_name: "group_update",
                description: "This Role/User can update another Group."
            },
            {
                name: "Can Delete Group",
                guard_name: "group_delete",
                description: "This Role/User can delete another Group."
            },
            {
                name: "Can Get Group",
                guard_name: "group_get",
                description: "This Role/User can get general information of a single Group."
            },
            {
                name: "Can Get Multiple Groups",
                guard_name: "group_get_multi",
                description: "This Role/User can get general information of multiple Groups."
            },
            {
                name: "Can Asign User To Group",
                guard_name: "asign_user_to_group",
                description: "This Task can Asign User To Group"
            },
            {
                name: "Can Asign User To Permision",
                guard_name: "asign_user_to_permision",
                description: "This Task can Asign User To Permision"
            },
            {
                name: "Can Asign User To Role",
                guard_name: "asign_user_to_role",
                description: "This Task can Asign User To Role"
            },
            {
                name: "Can Asign Role To Permision",
                guard_name: "asign_role_to_permision",
                description: "This Task can Asign Role To permision"
            },
    
            {
                name: "Log Update",
                guard_name: "log_update",
                description: "Log Has Been Updated"
            },
            {
                name: "Log Delete",
                guard_name: "log_delete",
                description: "Log Has Been Deleted"
            },
            {
                name: "Presence Anywhere",
                guard_name: "presence_anywhere",
                description: "This User Can Absent On Any Device."
            },
            {
                name: "Open Door Anywhere",
                guard_name: "open_door_anywhere",
                description: "This User Can Open Door On Any Device."
            },
            {
                name: "show_other_log",
                guard_name: "show_other_log",
                description: "This User Can Get Other User log On Any Device."
            },
            {
                name: "Download Photo",
                guard_name: "download_photo",
                description: "This Role/User Can Download Photo From Log ."
            },
            {
                name: "Can Create Permission",
                guard_name: "permission_create",
                description: "This Role/User can create another Permission."
            },
            {
                name: "Can Update Permission",
                guard_name: "permission_update",
                description: "This Role/User can update another Permission."
            },
            {
                name: "Can Delete Permission",
                guard_name: "permission_delete",
                description: "This Role/User can delete another Permission."
            },
            {
                name: "Can Get Permission",
                guard_name: "permission_get",
                description: "This Role/User can get general information of a single Permission."
            },
            {
                name: "Can Get Multiple Permissions",
                guard_name: "permission_get_multi",
                description: "This Role/User can get general information of multiple Groups."
            },
            {
                name: "Show Other Log",
                guard_name: "show_other_log",
                description: "This Role/User can get other logs."
            },
            {
                name: "Get All Group",
                guard_name: "get_all_group",
                description: "This Role/User can get all groups"
            },
            {
                name: "Get All User",
                guard_name: "show_all_users",
                description: "This Role/User can show all users"
            },
        ]
    })
}