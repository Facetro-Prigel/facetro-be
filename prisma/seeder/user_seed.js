const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const genPass = require('../../helper/generator');
const utils = require('../../helper/utils')
exports.run = async () => {
    await prisma.user.create({
        data:
        {
            name: "Muhammad Iqbal",
            identity_number: "5312421026",
            password: await genPass.generatePassword("nGXolN):Z2lL"),
            email: "xmod3905@students.unnes.ac.id",
            telegram_token: "cZQJlk8Ap0",
            telegram_id: 916398968,
            nfc_data: "805427AA",
            signature: "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",
            bbox:[301, 154, 743],
            avatar:"YPuyUGybapISIra0QXOgUUx.jpg",
            role_user: {
                create: {
                    role: {
                        connect: {
                            guard_name: 'super_admin',
                        }
                    }
                }
            }
        }
    })
    const admin_seed = [
        {
          "name": "Dr. Anan Nugroho, S.T., M.Eng.",
          "identity_number": "198409052019031006",
          "password": "$2b$14$i/5OjR2YMwj1qnzYdpEM1OqS12ee3QXbN5UVbWtxB4LXr00ldnjqa",
          "email": "anannugroho@mail.unnes.ac.id",
          "bbox": [
            320,
            237,
            598
          ],
          "avatar": "wWUXMYJhecziAOjNd7STe6S.jpg",
          "signature": "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",
          "telegram_id": 48318211,
          "telegram_token": "i0uzDBSh8C",
          "nfc_data": "02B2A473"
        }
      ];
    for (let items of admin_seed) {
        await prisma.user.create({
            data:
            {
                name: items.name,
                identity_number: items.identity_number,
                password: items.password,
                email: items.email,
                telegram_token: items.telegram_token,
                avatar: items.avatar,
                telegram_id: items.telegram_id,
                nfc_data: items.nfc_data,
                signature: items.signature,
                bbox: items.bbox,
                role_user: {
                    create: {
                        role: {
                            connect: {
                                guard_name: 'admin',
                            }
                        }
                    }
                }
            }
        })
    }
}