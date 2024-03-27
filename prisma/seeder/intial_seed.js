const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const permision_seed = require('./permissions_seed')
const role_seed = require('./role_seed')
const user_seed = require('./user_seed')
const device_seed = require('./device_seed')
const group_seed = require('./group_seed')
const user_group_seed = require('./user_grup_seed')

const main = async () => {
    await permision_seed.run();
    await role_seed.run();
    await user_seed.run();
    await device_seed.run();
    await group_seed.run();
}
main()
    .then(async () => {
        // await user_group_seed.run();
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })