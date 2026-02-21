const cron = require('node-cron');
const ReportService = require('../services/ReportService');

const initCronJobs = () => {
    // === WEEKLY CRON JOB ===
    // Runs every Saturday at 23:55 (11:55 PM)
    cron.schedule('55 23 * * 6', async () => {
        try {
            console.log('[CRON] Starting weekly report generation...');

            const now = new Date();
            const endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);

            const startDate = new Date(now);
            startDate.setDate(now.getDate() - 6); // Last 7 days including today
            startDate.setHours(0, 0, 0, 0);

            await ReportService.generateReport('weekly', startDate, endDate);

            console.log('[CRON] Weekly report generated successfully.');
        } catch (error) {
            console.error('[CRON ERROR] Failed to generate weekly report:', error);
        }
    });

    // === MONTHLY CRON JOB ===
    // Runs on the 1st of every month at 00:05 AM to generate for previous month
    cron.schedule('5 0 1 * *', async () => {
        try {
            console.log('[CRON] Starting monthly report generation...');

            const now = new Date();
            const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const endDate = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of prev month

            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);

            await ReportService.generateReport('monthly', startDate, endDate);

            console.log('[CRON] Monthly report generated successfully.');
        } catch (error) {
            console.error('[CRON ERROR] Failed to generate monthly report:', error);
        }
    });

    console.log('[CRON] Report scheduled tasks initialized.');
};

module.exports = initCronJobs;
