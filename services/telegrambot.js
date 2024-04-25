
const { PrismaClient } = require('@prisma/client')
const { Telegraf } = require('telegraf')
const { message } = require('telegraf/filters')
const prisma = new PrismaClient();
const utils = require('../helper/utils')
const { generateString } = require('../helper/generator')
const role_utils = require('../helper/role_utils');
const { Agent } = require("node:https");
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

const bot = new Telegraf(process.env.BOT_TOKEN, {
	telegram: {
        apiRoot: "http://api.telegram.org",
		agent: new Agent({ keepAlive: false })
	},
});
// bot.telegram.deleteWebhook()
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

bot.command('izin', async (ctx) => {
    ctx.replyWithMarkdownV2("* Maaf fitur ini masih dalam pengembangan *")
    ctx.replyWithMarkdownV2("* Fitur dirilis pada 29 April 2024 *")
})

bot.command('broadcast', async (ctx) => {
    ctx.replyWithMarkdownV2("* Maaf fitur ini masih dalam pengembangan *")
    ctx.replyWithMarkdownV2("* Fitur dirilis pada 29 April 2024 *")
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
bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))