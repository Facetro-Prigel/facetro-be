const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
const generatePassword = async (password) =>{
    const salt = await bcrypt.genSalt(14);
    return await bcrypt.hash(password, salt);
}
exports.run = async () =>{
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