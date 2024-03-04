const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
 const permissions_seed = await prisma.permission.createMany({
    data:[
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
            guardName: "user_get_multi", 
            description: "This Role/User can get  information of multi Device."
        },
        {
            name: "Can Get Multiple Device ",
            guardName: "device_get_multi", 
            description: "This Role/User can get  information of multi Device."
        },

    ]
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