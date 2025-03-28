const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

module.exports = {
    getUserWithRole: async (role, select = false) =>{
        let superUsers = [] 
        const superAdminUser = await prisma.role.findUnique({where:{
            guard_name: role
        }, include:{
            role_user:{
                include:{
                    user:true
                }
            }
        }})
        if(superAdminUser){
            let superUsersObj = superAdminUser.role_user
            for (let user of superUsersObj) {
                if(select){
                    if(user.user[select]){
                        superUsers.push(user.user[select])
                    }
                }else{
                    superUsers.push(user.user) 
                }
            }
        }
        return superUsers ?? undefined
    }
}