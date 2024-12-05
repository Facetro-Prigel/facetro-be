const { Telegraf } = require('telegraf');
const bot = new Telegraf(process.env.BOT_TOKEN);
require('dotenv').config();

module.exports = {
    bot: bot
}