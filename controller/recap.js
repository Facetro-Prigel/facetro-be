const { PrismaClient } = require('@prisma/client')

const generator = require('../helper/generator')
const utils = require('../helper/utils')
const { bot } = require('../helper/telegram')
const { fetchLog, handleGetLog } = require('../controller/log')
const axios = require('axios')
const role_utils = require('../helper/role_utils');
const prisma = new PrismaClient()

class RecapGenerator {
    constructor(data) {
        this.previousMonth = "";
        this.previousYear = "";
        this.currentMonth = "";
        this.currentYear = "";
        this.user = "";
        this.row = 1;
        this.data = data;
        this.workbook = new ExcelJS.Workbook();
        this.monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    }

    calculateDuration(day) {
        const loginTime = new Date(day.login);
        const logoutTime = new Date(day.logout);

        const duration = logoutTime - loginTime;

        const seconds = Math.floor((duration / 1000) % 60);
        const minutes = Math.floor((duration / (1000 * 60)) % 60);
        const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

        return hours;
    }

    createWeeklyHeader(worksheet) {
        const daysHeader = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        daysHeader.forEach((day, index) => {
            const cell = worksheet.getCell(this.row, index + 1);
            cell.value = day;
            cell.alignment = { horizontal: 'center' };
            cell.font = { bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } };
        });
        this.row += 1;
    }

    createHeader(worksheet, name) {
        worksheet.mergeCells(`A${this.row}:G${this.row}`);
        worksheet.getCell(`A${this.row}`).value = `${name}`;
        worksheet.getCell(`A${this.row}`).alignment = { horizontal: 'center' };
        worksheet.getCell(`A${this.row}`).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getCell(`A${this.row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0070C0' } };
        this.row += 1;

        if (this.monthNames.includes(name)) {
            this.createWeeklyHeader(worksheet);
        }
    }

    placeDate(worksheet, date) {
        const dayOfWeek = date.getDay();
        const column = dayOfWeek + 1;

        const cell = worksheet.getCell(this.row, column);
        cell.value = date.getDate();

        const day = this.data[this.key][date];
        cell.fill = { type: 'pattern', pattern: 'solid' };

        if (!day.logout || !day.logout) {
            cell.fill.color = { argb: 'FFFF0000' };
        }else if(this.calculateDuration(day) < 8){
            cell.fill.color = { argb: 'FFFFFF00' };
        }else if (this.calculateDuration(day) >= 8) {
            cell.fill.color = { argb: 'FF00FF00' };
        }

        cell.alignment = { horizontal: 'center' };
    }
async createCalendarExcel() {
    for (const key of Object.keys(this.data)) {
        this.user = key;
        const worksheet = this.workbook.addWorksheet(key);

        const sortedData = Object.values(this.data[key]).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const start = sortedData[0].createdAt; 
        const end = sortedData[sortedData.length - 1].createdAt;

        // Proses batch di sini
        await this.processUserSheetInBatches(start, end, worksheet);
    }

    return this.workbook.xlsx.writeBuffer();
}

async processUserSheetInBatches(start, end, worksheet) {
    let currentDate = new Date(start);
    const endDate = new Date(end);
    const batchSize = 7; // misalnya batch mingguan
    const batch = [];

    while (currentDate <= endDate) {
        batch.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);

        // Jika batch penuh atau mencapai akhir bulan
        if (batch.length === batchSize || currentDate.getMonth() !== batch[0].getMonth()) {
            await this.processBatch(batch, worksheet);
            batch.length = 0;
        }
    }
}

async processBatch(batch, worksheet) {
    for (const date of batch) {
        this.placeDate(worksheet, date);
        if (date.getDay() === 6) this.row++;
    }
}
}

module.exports = {
    makeRecap: async (req, res) => {
        const users = req.body ? req.body.users : [req.params.uuid];
        const results = await fetchLog(users);
        
        const data = {};
    
        results.forEach(result => {
            const userName = result.user.name;
            const day = result.createdAt.getDate();
    
            if (!data[userName]) {
                data[userName] = {};
            }
            if (!data[userName][day]) {
                data[userName][day] = {
                    login: null,
                    logout: null
                };
            }
    
            const time = result.createdAt;
            if (!data[userName][day].login || time < data[userName][day].login) {
                data[userName][day].login = time;
            }
            if (!data[userName][day].logout || time > data[userName][day].logout) {
                data[userName][day].logout = time;
            }
        });
    
        const calendar = new RecapGenerator(data);
        const buffer = await calendar.createCalendarExcel();
    
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=recap.xlsx');
	res.setHeader('Content-Length', buffer.length);
        res.send(buffer);
    },
    
    handleGetLog
}
