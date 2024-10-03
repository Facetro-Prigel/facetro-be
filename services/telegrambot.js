
const { PrismaClient } = require('@prisma/client')
const { Telegraf, Markup } = require('telegraf')

const { message } = require('telegraf/filters')
const ProcessManager = require('./telegram_process_manager')
const prisma = new PrismaClient();
const utils = require('../helper/utils')
const { generateString } = require('../helper/generator')
const role_utils = require('../helper/role_utils');
const bot = new Telegraf(process.env.BOT_TOKEN);
const aboutUser = async (userUid, render = false) => {
    const result = await prisma.user.findUnique({
        where: {
            uuid: userUid
        }, include: {
            usergroup: {
                include: {
                    group: true
                }
            },
            roleuser: {
                include: {
                    role: {
                        include: {
                            permisionrole: {
                                include: {
                                    permission: true
                                }
                            }
                        }
                    }
                }
            },
            permissionUser: {
                include: {
                    permission: true
                }
            }
        }
    })
    if (result) {
        var groups = result.usergroup.map((i) => {
            return i.group.name
        })
        var role = result.roleuser.map((i) => {
            return i.role.name
        })
        var rolePermission = result.roleuser[0].role.permisionrole.map((i) => {
            return i.permission.name
        })
        if (result.roleuser[0].role.guardName == 'super_admin') {
            let superPremission = await prisma.permission.findMany({ select: { name: true } })
            rolePermission = superPremission.map((i) => {
                return i.name
            })
        }
        var directPermission = result.permissionUser.map((i) => {
            return i.permission.name
        })
        let dataBimbingan = await prisma.group.findMany({
            where: {
                notify_to: result.uuid
            }, select: {
                name: true
            }
        })
        dataBimbingan = dataBimbingan.map((s) => { return s.name })

        let mapingResults = {
            'name': result.name,
            'identity': result.identityNumber,
            'email': result.email,
            'program_study': result.program_study,
            'batch': result.batch,
            'role': role,
            'groups': groups,
            'rolePermission': rolePermission,
            'directPermission': directPermission,
            'notifed_by': dataBimbingan
        }
        if (render) {
            let renderFiled = ['Nama', 'Identitas', 'E-mail', 'Program Studi', 'Angkatan', 'Peran', 'Grup', 'Izin Peran', 'Izin Langsung', 'Akan dinotifikasi bila anggota group melakukan presensi']
            let txt = ''
            let n = 0
            for (const field in mapingResults) {
                txt += '*' + renderFiled[n] + '*:\n'
                txt += utils.arrayToHuman(mapingResults[field])+"\n\n"
                n += 1
            }
            return txt
        }
        return mapingResults
    }
}

async function menuLoader(userId) {
    let userResult = await prisma.user.findFirst({
        where: { telegramId: userId },
        include: {
            roleuser: { include: { role: {include: {permisionrole: {include: {permission: true}}}}}},
            usergroup: { include: { group: true } },
            permissionUser: { include: { permission: true } }
        }
    });

    // Cek apakah userResult ada dan apakah roleuser memiliki setidaknya satu peran
    if (!userResult || !userResult.roleuser || userResult.roleuser.length === 0) {
        // console.log(`Pengguna dengan Telegram ID ${userId} tidak memiliki peran atau peran tidak ditemukan.`);
        return;
    }

    // Get guardName from user role
    const userRole = userResult.roleuser[0].role.guardName;

    // Ambil semua permission dari role dan user
    const userPermissions = [
        // Permissions dari role
        ...userResult.roleuser.flatMap(ru => ru.role.permisionrole.map(pr => pr.permission.guardName)),
            
        // Permissions langsung dari user
        ...userResult.permissionUser.map(pu => pu.permission.guardName)
    ];

    let menu = [['ℹ️ Info'], []];
    if (userRole == 'super_admin') {
        menu.push(['🔉 Broadcast', '✉️ Izin']);
    }else{
        
        if (userPermissions.includes('izin')) {
            menu[1].push('✉️ Izin');
        }
        if (userPermissions.includes('broadcast_access') || userPermissions.includes('broadcast_access_all')) {
            menu[1].push('🔉 Broadcast');
        }
    }

    bot.telegram.sendMessage(userId, 'Selamat datang di Sistem Presensi Baru Factro! Silakan pilih menu di untuk menjalankan proses', Markup.keyboard(menu).resize().oneTime())
}

async function initMenu() {
    const users = await prisma.user.findMany({
        select: { telegramId: true } // Ambil hanya telegramId
    });

    // Iterate over each user and call menuLoader
    for (const user of users) {
        const userId = user.telegramId; // Simpan telegramId ke dalam userId

        // Pastikan userId tidak null atau undefined sebelum memanggil menuLoader
        if (userId != null) {
            if (userId == "1949236643")
                await menuLoader(userId);
        } else {
            // console.log(`User ID is null or undefined, skipping...`);
        }
    }
}

initMenu()

bot.command('connect', async (ctx) => {
    var result = await prisma.user.findFirst({
        where: {
            telegramToken: ctx.payload
        },include:{
            usergroup: {
                include: {
                    group: {
                        include: {
                            users: true
                        }
                    }
                }
            }
        },
    })
    if (result) {
        await prisma.user.update({
            where: {
                uuid: result.uuid
            },
            data: {
                telegramId: ctx.chat.id,
                telegramToken: generateString(10)
            }
        })
        var caption = 'Akun telegram berhasil ditautkan dengan:\n'
        var aboutUserObj =  await aboutUser(result.uuid, true)
        caption += aboutUserObj
        var infoChatId = 0
        var infoMsgId = 0 
        ctx.reply('Tunggu Sebentar! Sedang Mengirim Informasi!').then((e)=>{
            infoChatId = e.chat.id
            infoMsgId= e.message_id
        })
        let super_admin_users = await role_utils.getUserWithRole('super_admin', 'telegramId')
        let admin_users = await role_utils.getUserWithRole('admin', 'telegramId')
        let notify_to_users = result.usergroup.map((t) => {
            return t.group.users.telegramId
        })
        let notify_to = []
        notify_to = notify_to.concat(super_admin_users,admin_users,notify_to_users)
        notify_to = new Set(notify_to)
        ctx.reply(aboutUserObj)
        if(result.avatar){
            await ctx.replyWithPhoto({ source: "./" + result.avatar }, { caption: `Gambar ${result.name}` }).then(async (e)=>{
                await bot.telegram.deleteMessage(infoChatId, infoMsgId)
                for (let notify of notify_to) {
                    if (notify) {
                        await bot.telegram.sendPhoto(notify, { source: "./" + result.avatar }, { caption: `${result.name} sudah menghubungkan Akun telegramnya` })
                    }
                }
            }).catch((e)=>{
                console.log('Error While seding Image')
            })
        }

        for (let notify of notify_to) {
            if (notify) {
                bot.telegram.sendMessage(notify, aboutUserObj+"berhasil menghubungkan akunnya dengan telegram")
            }
        }
    } else {
        ctx.reply(`Maaf token yang diberikan salah!`)
    }
})

// Reimplement info
bot.hears('ℹ️ Info', async (ctx) => {
    var result = prisma.user.findFirst({
        where: {
            telegramId: ctx.chat.id
        },
    })
    if (result) {
        var caption = 'Akun telegram telah ditautkan dengan:\n'
        var aboutUserObj =  aboutUser(result.uuid, true)
        caption += aboutUserObj
        var infoChatId = 0
        var infoMsgId = 0 
        ctx.reply('Tunggu Sebentar! Sedang Mengirim Informasi!').then((e)=>{
            infoChatId = e.chat.id
            infoMsgId= e.message_id
        })
        let photo = ''
        if(result.avatar){
            photo = ctx.replyWithPhoto({ source: "./" + result.avatar }, { caption: `Gambar ${result.name}` }).then((e)=>{
                bot.telegram.deleteMessage(infoChatId, infoMsgId)
            })
        }
        ctx.reply(caption)
        menuLoader(ctx.from.id);
        
    } else {
        ctx.reply(`Akun ini (ID: ${ctx.chat.id}) belum tertaut dengan Sistem Presensi. Check e-mail unnes untuk informasi lebih lanjut!`)
    }
})  

const processManager = new ProcessManager(bot, menuLoader);
// Reimplement broadcast
bot.hears('✉️ Izin', async (ctx) => {
    return ctx.reply(`Fitur ini sedang ada maintenance. Stay tune ya😉`)
    // try {
    //     const userId = ctx.from.id;

    //     // Ambil user berdasarkan telegramId
    //     const userResult = await prisma.user.findFirst({
    //         where: { telegramId: userId },
    //         include: { usergroup: { include: { group: true } } }
    //     });

    //     if (!userResult) {
    //         throw new Error('User tidak ditemukan.');
    //     }

    //     // Ambil semua groupId yang dimiliki oleh user
    //     const groupIds = userResult.usergroup.map(gu => gu.group.uuid);

    //     if (groupIds.length === 0) {
    //         throw new Error('User tidak terhubung dengan group manapun.');
    //     }

    //     // Cari semua grup yang memiliki groupIds yang sama, dan ambil notify_to
    //     const notifyToResults = await prisma.group.findMany({
    //         where: { uuid: { in: groupIds } },
    //         select: { notify_to: true },
    //     });

    //     // Ambil UUID pemimpin group (notify_to) secara unik
    //     const notify_to_uuids = notifyToResults.map(group => group.notify_to);

    //     if (notify_to_uuids.length === 0) {
    //         throw new Error('Tidak ditemukan pemimpin group (notify_to) untuk group terkait.');
    //     }

    //     // Cari telegramId dari user yang merupakan notify_to
    //     const notify_to_teleIds = await prisma.user.findMany({
    //         where: {OR: [
    //             {uuid: {in: notify_to_uuids}},
    //             {roleuser: { some: { role: { guardName: 'super_admin' }}}}
    //         ]},
    //         select: { telegramId: true },
    //         include: {roleuser: {include: {role: true}}}
    //     });

    //     // Dapatkan array dari telegramId pemimpin
    //     const notify_to_teleId = notify_to_teleIds.map(user => user.telegramId);

    //     // Define the steps for the izin process
    //     const steps = [
    //         {
    //             name: 'text',
    //             prompt: 'Silakan tuliskan detail izin (contoh: izin sakit, tugas lembaga, lomba):',
    //             required: true,
    //             onComplete: async (ctx, data) => {
    //                 const message = `===== INFORMASI IZIN =====\nNama: ${userResult.name}\nNIM: ${userResult.identityNumber}\nProdi: ${userResult.program_study}\nNomor Telepon: ${userResult.phoneNumber ? userResult.phoneNumber : 'Tidak ada'}\nGrup: ${userResult.usergroup.map(ug => ug.group.name).join(', ')}\n===========================\n${ctx.message.text}`;

    //                 // Kirim informasi ke setiap notify_to
    //                 for (const notifyId of notify_to_teleId) {
    //                     try {
    //                         await bot.telegram.sendMessage(notifyId, message);
    //                     } catch (error) {
    //                         console.error(`Gagal mengirim pesan ke ${notifyId}:`, error);
    //                         await ctx.reply(`Gagal mengirim informasi izin ke ${notifyId}`);
    //                     }
    //                 }
        
    //                  ctx.reply('Izin Anda telah berhasil diajukan.');
    //             }
    //         }
    //     ];

    //     // Start the process for the user
    //     processManager.startProcess(userId, steps);
    //     processManager.nextStep(userId, ctx)

    // } catch (error) {
    //     ctx.reply(`Terjadi kesalahan saat memulai proses izin.`);
    // }
});


// Reimplement izin
bot.hears('🔉 Broadcast', async (ctx) => {
    const userId = ctx.from.id;

    try {
        // ambil role dan grup user
        const userResult = await prisma.user.findFirst({
            where: { telegramId: userId },
            include: {
                roleuser: { include: { role: {include: {permisionrole: {include: {permission: true}}}}}},
                usergroup: { include: { group: true } },
                permissionUser: { include: { permission: true } }
            }
        });

        // kalau ngga ada, berhenti
        if (!userResult) {
            return ctx.reply('Pengguna tidak ditemukan.');
        }

        // ambil rolenya user
        const userRoles = userResult.roleuser.map(ru => ru.role.guardName);
        
        // Ambil semua permission dari role dan user
        const userPermissions = [
            // Permissions dari role
            ...userResult.roleuser.flatMap(ru => ru.role.permisionrole.map(pr => pr.permission.guardName)),

            // Permissions langsung dari user
            ...userResult.permissionUser.map(pu => pu.permission.guardName)
        ];

        // Ambil nama grup sesuai izin
        let groupData = [];

        // Jika pengguna memiliki izin 'broadcast_access', ambil grup yang dimiliki
        if (userPermissions.includes('broadcast_access')) {
            groupData = userResult.usergroup.map(gu => ({
                name: gu.group.name,
                uuid: gu.group.uuid
            }));
        }

        // Jika pengguna adalah super_admin, ambil semua grup
        if (userRoles.includes('super_admin') || userPermissions.includes('broadcast_access_all')) {
            const groups = await prisma.group.findMany({ select: { name: true, uuid: true }});
            groupData = groups.map(group => ({
                name: group.name,
                uuid: group.uuid
            }));
        }

        // Cek apakah ada grup yang diizinkan
        if (groupData.length === 0) {
            return ctx.reply('Anda tidak memiliki izin untuk menggunakan perintah ini.');
        }

        // Membuat array untuk tombol inline dengan grup yang ada
        let inlineButtons = groupData.map(gd => [{
                text: gd.name,
                callback_data: gd.uuid 
            }
        ]);

        // Tambahkan tombol 'Selesai'
        inlineButtons.push([{
            text: '✅ Selesai',
            callback_data: 'stop'
        }]);

        // definisi langkah-langkah broadcasting
        const steps = [
            {
                // Step 1: Meminta input text
                name: 'text',
                validate: async (ctx) => {
                    if (!ctx.message.text) {
                        return false;
                    }
                    return true;
                },
                required: true
            },
            {
                // Step 1: Meminta input text
                name: 'text',
                prompt: 'Silakan masukkan pesan yang ingin dikirimkan:',
                validate: async (ctx) => {
                    if (!ctx.message.text) {
                        await ctx.reply('Input tidak valid. Mohon diulang kembali!');
                        return false;
                    }3

                    return true;
                },
                required: true
            },
            {
                // Step 2: Pilih grup
                name: 'group',
                prompt: `Silakan pilih grup yang ingin dijadikan tujuan broadcast:`,
                markup_reply: {
                    reply_markup: {
                        inline_keyboard: inlineButtons
                    }
                },
                validate: async (ctx) => {
                    if (!ctx.callbackQuery) {
                        await ctx.reply('Input tidak valid. Mohon diulang kembali!');
                        return false;
                    }
                    return true;
                },
                required: true,

                // ini kalau udah selesai prosesnya
                onComplete: async (ctx, data) => {

                    const selectedGroupUuid = processManager.sessions[userId].data.userInputs;
                    
                    // Mencari grup yang sesuai dengan UUID yang dipilih
                    const groupResults = await prisma.userGroup.findMany({
                        where: {
                            group: {uuid: {in: selectedGroupUuid}}
                        },
                        include: {user: true, group: true}
                    });

                    // Jika grup tidak ditemukan, beri tahu pengguna
                    if (groupResults.length === 0) {
                        return ctx.reply('Grup yang dipilih tidak valid.');
                    }

                    // Buat pesan broadcast
                    const message = `===== INFORMASI BROADCAST =====\nNama: ${userResult.name}\nNomor ID: ${userResult.identityNumber}\nNomor Telepon: ${userResult.phoneNumber ? userResult.phoneNumber : 'Tidak ada'}\nDitujukan pada grup: ${[...new Set(groupResults.map(result => result.group.name))].join(', ')}\n===============================\n${data.text.text}`;

                    // Ambil telegramId dari setiap user di grup yang sama, kecuali pengirim
                    const notifyTo = [...new Set(groupResults
                        .filter(ug => ug.user.telegramId !== userResult.telegramId) // Kecualikan pengirim
                        .map(ug => ug.user.telegramId))];

                    // Kirim pesan ke setiap pengguna di grup
                    if (notifyTo.length > 0) {
                        for (let notify of notifyTo) {
                            try {
                                if (notify) {
                                    await bot.telegram.sendMessage(notify, message);
                                }
                            } catch (error) {
                                console.error(`Error sending message to ${notify}: `, error);
                            }
                        }
                    } else {
                        ctx.reply('Tidak ada anggota grup yang bisa menerima pesan.');
                    }
                    ctx.reply('Broadcast telah berhasil dilakukan.');
                }
            }
        ];

        // pengaturan proses
        processManager.startProcess(userId, steps);
        processManager.nextStep(userId, ctx);

    } catch (error) {
        console.error('Error during broadcast command:', error);
        ctx.reply(`Terjadi kesalahan saat memulai proses broadcast. error: ${error}`);
    }
});

// Start command
bot.start((ctx) => {
    ctx.reply('Selamat Datang di Sistem Presensi yang baru, Semoga Harimu menyenangkan!\nPERINGATAN! Kamu belum menghubngkan akun telegram ini dengan sistem presensi. Check Email (UNNES) untuk mengetahui caranya!')
    if(ctx.message.message_id < 2){
        ctx.reply(`Kamu adalah orang Pertama yang mengintegrasikan ke sistem Presensi! Yey!`)
    }
})

// Dynamic action handler for all callback queries
bot.on('callback_query', async (ctx) => {
    const callbackData = ctx.callbackQuery.data;
    const userId = ctx.from.id;
    
    // Pastikan sesi user ada di ProcessManager
    if (!processManager.sessions[userId]) {
      return ctx.reply('Proses belum dimulai. Silakan pilih salah satu proses yang ada di menu.');
    }
  
    // Ambil sesi pengguna
    const session = processManager.sessions[userId];
  
    // Handle 'Stop' button click
    if (callbackData === 'stop') {
        if (!session.data.userInputs || session.data.userInputs.length === 0) {
            return ctx.reply('Anda tidak memilih apapun.');
        }

        await ctx.deleteMessage();

        // Lanjutkan ke langkah berikutnya
        await processManager.nextStep(userId, ctx);
    }else{ 
        // tambahkan grup yang baru dipilih
        session.data.userInputs.push(callbackData);

        const groupResult = await prisma.group.findUnique({
            where: {uuid: callbackData}
        });
    
        // Tampilkan konfirmasi pilihan user
        ctx.answerCbQuery(`Kamu sudah memilih ${groupResult.name}`);
    }
  });

// Event handler for handling user input
bot.on("text", async (ctx) => {
    const userId = ctx.from.id;
    
    // Check if the user has an active session in ProcessManager
    const session = processManager.sessions[userId];
    
    // If the session exists, proceed to the next step
    if (session) {
        try {
            // Pass the context to the next step in the process
            await processManager.nextStep(userId, ctx);
        } catch (error) {
            console.error('Error while processing next step:', error);
            await ctx.reply('Terjadi kesalahan. Silakan coba lagi.');
        }
    } else {
        // If no session, handle normally or provide a message
        await ctx.reply('Proses belum dimulai. Silakan pilih salah satu proses yang ada di menu.');
    }
});

bot.launch();

// let error_k = 0
// const launch = () =>{
//     bot.launch().then(()=>{
//         console.info('Akhirnya Berhasil')
//     }).catch((e)=>{
//         console.error(`Telegram tidak aktif, dipercobaan ke-${error_k}`)
//         console.error(e)
//         if(error_k < 10){
//             launch()
//             error_k += 1
//         }else{
//             error_k = 0
//             console.info('tunggu 5 detik')
//             setTimeout(() => {
//                 launch()
//             }, 5000); 
//         }
//     })
// }
// launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))