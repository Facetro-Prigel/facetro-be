
const { PrismaClient } = require('@prisma/client')
const { Telegraf } = require('telegraf')
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

bot.start((ctx) => {
    ctx.reply('Selamat Datang di Sistem Presensi yang baru, Semoga Harimu menyenangkan!\nPERINGATAN! Kamu belum menghubngkan akun telegram ini dengan sistem presensi. Check Email (UNNES) untuk mengetahui caranya!')
    if(ctx.message.message_id < 2){
        ctx.reply(`Kamu adalah orang Pertama yang mengintegrasikan ke sistem Presensi! Yey!`)
    }
})

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
                await bot.telegram.sendMessage(notify, aboutUserObj+"berhasil menghubungkan akunnya dengan telegram")
            }
        }
    } else {
        ctx.reply(`Maaf token yang diberikan salah!`)
    }
})

bot.command('info', async (ctx) => {
    var result = await prisma.user.findFirst({
        where: {
            telegramId: ctx.chat.id
        },
    })
    if (result) {
        var caption = 'Akun telegram telah ditautkan dengan:\n'
        var aboutUserObj =  await aboutUser(result.uuid, true)
        caption += aboutUserObj
        var infoChatId = 0
        var infoMsgId = 0 
        ctx.reply('Tunggu Sebentar! Sedang Mengirim Informasi!').then((e)=>{
            infoChatId = e.chat.id
            infoMsgId= e.message_id
        })
        let photo = ''
        if(result.avatar){
            photo = await ctx.replyWithPhoto({ source: "./" + result.avatar }, { caption: `Gambar ${result.name}` }).then((e)=>{
                bot.telegram.deleteMessage(infoChatId, infoMsgId)
            })
        }
        await ctx.reply(caption)
        
    } else {
        ctx.reply(`Akun ini (ID: ${ctx.chat.id}) belum tertaut dengan Sistem Presensi. Check e-mail unnes untuk informasi lebih lanjut!`)
    }
})


/**
 * kode menuLoader dan initMenu digunakan untuk menampilkan menu
 * pada setiap user. menuLoader digunakan greeting ke user
 * dengan telegramId tertentu, demikian untuk initMenu yang
 * menerapkan untuk semua user saat bot mulai dinyalakan. Untuk
 * text yang ditampilkan di button, masih dalam bentuk command
 * langsung, bisa untuk future notes untuk diupgrade.
 */


async function menuLoader(userId) {
    // Pastikan userId valid
    if (typeof userId !== 'string') {
        userId = userId.toString(); // Ubah userId menjadi string
    }

    let userResult = await prisma.user.findFirst({
        where: { telegramId: userId },
        include: {
            roleuser: { include: { role: true } },
            usergroup: { include: { group: true } }
        }
    });

    // Cek apakah userResult ada dan apakah roleuser memiliki setidaknya satu peran
    if (!userResult || !userResult.roleuser || userResult.roleuser.length === 0) {
        // console.log(`Pengguna dengan Telegram ID ${userId} tidak memiliki peran atau peran tidak ditemukan.`);
        return;
    }

    // Get guardName from user role
    const userRole = userResult.roleuser[0].role.guardName;
    // Logic for menu
    let menu;
    if (userRole === 'lecturer') {
        menu = [['/info'], ['/broadcast']];
    } else if (['admin', 'super_admin'].includes(userRole)) {
        menu = [['/info'], ['/broadcast', '/izin']];
    } else if (userRole === 'students') {
        menu = [['/info'], ['/izin']];
    } else {
        // console.log(`Pengguna dengan Telegram ID ${userId} tidak diizinkan menggunakan perintah ini.`);
        return;
    }

    // Coba kirim pesan dengan menu
    try {
        await bot.telegram.sendMessage(userId, "Selamat Datang di Sistem Presensi Baru Facetro! Silahkan pilih menu di bawah ini:", {
            reply_markup: {
                keyboard: menu
            }
,        });
    } catch (error) {
        // console.error(`Gagal mengirim pesan ke pengguna ${userId}: ${error.response}`);
        // Skip pengguna yang tidak ada chatnya
    }
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

/**
 * ProcessManager diinstantiate untuk definisi proses handling
 * multiple input dari user. Untuk kali ini handling masih hanya
 * terbatas pada text handling dengan bot.on("text"), pengembangan
 * masih bisa dilanjut ke tipe data lain. 
 */
const processManager = new ProcessManager(bot);

/**
 * Command /izin untuk kali ini sudah memungkinkan user untuk mengirim izin 
 * pada notify_to. Pengembangan lanjut bisa dilanjutkan ke tipe data lain
 * seperti document, gambar, dll. Untuk kali ini role user yang bisa mengirim 
 * izin adalah students, admin dan super_admin.
 */
bot.command('izin', async (ctx) => {
    try {
        const userId = ctx.from.id;

        // Ambil user berdasarkan telegramId
        const userResult = await prisma.user.findFirst({
            where: { telegramId: userId },
            include: { usergroup: { include: { group: true } } } // tidak perlu include 'user' di sini karena tidak digunakan
        });

        if (!userResult) {
            throw new Error('User tidak ditemukan.');
        }

        // Ambil semua groupId yang dimiliki oleh user
        const groupIds = userResult.usergroup.map(gu => gu.group.uuid);

        if (groupIds.length === 0) {
            throw new Error('User tidak terhubung dengan group manapun.');
        }

        // Cari semua grup yang memiliki groupIds yang sama, dan ambil notify_to
        const notifyToResults = await prisma.group.findMany({
            where: { uuid: { in: groupIds } },
            select: { notify_to: true }
        });

        // Ambil UUID pemimpin group (notify_to) secara unik
        const notify_to_uuids = notifyToResults.map(group => group.notify_to);

        if (notify_to_uuids.length === 0) {
            throw new Error('Tidak ditemukan pemimpin group (notify_to) untuk group terkait.');
        }

        // Cari telegramId dari user yang merupakan notify_to
        const notify_to_teleIds = await prisma.user.findMany({
            where: { uuid: { in: notify_to_uuids } },
            select: { telegramId: true }
        });

        // Dapatkan array dari telegramId pemimpin
        const notify_to_teleId = notify_to_teleIds.map(user => user.telegramId);

        // Define the steps for the izin process
        const steps = [
            {
                name: 'text',
                prompt: 'Silakan tuliskan detail izin (contoh: izin sakit, tugas lembaga, lomba):',
                required: true,
                onComplete: async (ctx, data) => {
                    const message = `===== INFORMASI IZIN =====\nNama: ${userResult.name}\nNIM: ${userResult.identityNumber}\nProdi: ${userResult.program_study}\nNomor Telepon: ${userResult.phoneNumber ? userResult.phoneNumber : 'Tidak ada'}\nGrup: ${userResult.usergroup.map(ug => ug.group.name).join(', ')}\n===========================\n${ctx.message.text}`;

                    // Kirim informasi ke setiap notify_to
                    for (const notifyId of notify_to_teleId) {
                        try {
                            await bot.telegram.sendMessage(notifyId, message);
                        } catch (error) {
                            console.error(`Gagal mengirim pesan ke ${notifyId}:`, error);
                            await ctx.reply(`Gagal mengirim informasi izin ke ${notifyId}`);
                        }
                    }
        
                    await ctx.reply('Izin Anda telah berhasil diajukan.');
                }
            }
        ];

        // Start the process for the user
        processManager.startProcess(userId, steps);
        ctx.reply(steps[0].prompt); // Start with the first prompt

    } catch (error) {
        ctx.reply(`Terjadi kesalahan saat memulai proses izin. Error: ${error.message}`);
    }
});

/** 
 * Broadcast digunakan untuk mengirim pesan ke seluruh group secara
 * langsung. Fitur ini bisa digunakan oleh admin, super_admin dan 
 * lecturer.
 */

bot.command('broadcast', async (ctx) => {
    const userId = ctx.from.id;

    try {
        // ambil role dan grup user
        const userResult = await prisma.user.findFirst({
            where: { telegramId: userId },
            include: {
                roleuser: { include: { role: true } },
                usergroup: { include: { group: true } }
            }
        });

        // kalau ngga ada, berhenti
        if (!userResult) {
            return ctx.reply('Pengguna tidak ditemukan.');
        }

        // definisi role yang diizinkan
        const allowedRoles = ['super_admin', 'admin', 'lecturer'];

        // ambil role yang dimiliki oleh user
        const userRoles = userResult.roleuser.map(ru => ru.role.guardName);
        
        // kalau role user bukan role yang diizinkan, berhenti
        if (!userRoles.some(role => allowedRoles.includes(role))) {
            return ctx.reply('Anda tidak diizinkan menggunakan perintah ini.');
        }

        // ambil grup user
        let groupNames = userResult.usergroup.map(gu => gu.group.name);

        // membuat array untuk tombol inline
        const inlineButtons = groupNames.map(groupName => [
            {
                text: groupName,
                callback_data: groupName
            }
        ]);

        // definisi langkah-langkah broadcasting
        const steps = [
            {
                // Step 1: Meminta input text
                name: 'text',
                prompt: 'Silakan masukkan pesan yang ingin dikirimkan:',
                validate: async (ctx) => {
                    if (!ctx.message.text) {
                        await ctx.reply('Input tidak valid. Mohon diulang kembali!');
                        return false;
                    }
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
                    const message = `===== INFORMASI BROADCAST =====\nNama: ${userResult.name}\nNomor ID: ${userResult.identityNumber}\nNomor Telepon: ${userResult.phoneNumber ? userResult.phoneNumber : 'Tidak ada'}\nGrup: ${ctx.callbackQuery.data}\n===============================\n${data.text.text}`;

                    // mengambil grup yang dipilih
                    const selectedGroups = ctx.callbackQuery.data;
                    
                    // cek grup yang dipilih
                    const groupResults = await prisma.userGroup.findMany({
                        where: {group: {name: {in: [selectedGroups]}}},
                        include: {user: true, group: true}
                    });

                    // kalau grup yang dipilih tidak ada, skip
                    if (groupResults.length === 0) {
                        return ctx.reply('Grup yang dipilih tidak valid.');
                    }

                    // ambil telegramId dari setiap user di grup yang sama, abaikan user yang sedang mengirim pesan
                    const notify_to = groupResults.filter(ug => ug.user.telegramId != userId).map(ug => ug.user.telegramId);                    

                    // bagian ini untuk mengirim pesannya
                    if (notify_to.length > 0) {
                        for (let notify of notify_to) { 
                            try {
                                if (notify) {
                                    await bot.telegram.sendMessage(notify, message);
                                }
                            } catch (error) {
                                
                            }
                        }
                    }
                    // konfirmasi
                    ctx.reply('Pesan broadcast telah dikirim ke grup yang dipilih!');
                }
            }
        ];

        // trigger proses pertama
        processManager.startProcess(userId, steps);
        ctx.reply(steps[0].prompt);

    } catch (error) {
        // console.error('Error during broadcast command:', error);
        ctx.reply('Terjadi kesalahan saat memulai proses broadcast.');
    }
});

// event handler untuk message
bot.on('message', async (ctx) => {
    const userId = ctx.from.id;
    await processManager.nextStep(userId, ctx);
});

// event handler untuk callback_query dari inline keyboard
bot.on('callback_query', async (ctx) => {
    // Memastikan bahwa callback query berasal dari proses yang valid
    const userId = ctx.from.id;
    const session = processManager.sessions[userId];

    if (session) {
        // Memanggil nextStep untuk melanjutkan ke langkah berikutnya
        await processManager.nextStep(userId, ctx);
    } else {
        ctx.answerCbQuery('Input tidak valid atau sudah keluar sesi T&J.');
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