const cron = require('node-cron');
const { Client, Collection } = require('../models');
const { Op } = require('sequelize');
const EvolutionService = require('../services/EvolutionService');
const msg = require('../utils/MessageVariation');
const { differenceInDays, subDays } = require('date-fns');

const initChurnCron = () => {
    // Run every day at 09:30 AM
    cron.schedule('30 9 * * *', async () => {
        console.log('[CHURN CRON] 🚀 Starting daily churn prevention check...');
        try {
            await runChurnCheck();
            console.log('[CHURN CRON] ✅ Churn check completed.');
        } catch (error) {
            console.error('[CHURN CRON ERROR] Failed to run churn check:', error);
        }
    });
};

const runChurnCheck = async () => {
    // 1. Get all clients that have recurrence properly configured
    const clients = await Client.findAll({
        where: {
            recurrenceDays: { [Op.gt]: 0 },
            phone: { [Op.not]: null }
        },
        include: [{
            model: Collection,
            as: 'collections', // using lowercase 'collections' as default unless explicitly named 'Collections'
            attributes: ['date'],
            order: [['date', 'DESC']],
            limit: 1 // We only need the latest collection
        }]
    });

    const now = new Date();
    let remindersSent = 0;

    for (const client of clients) {
        // Find latest collection date
        let latestDate = null;
        if (client.collections && client.collections.length > 0) {
            latestDate = new Date(client.collections[0].date);
        } else {
            // If they never had a collection, we use their creation date as baseline
            latestDate = new Date(client.createdAt);
        }

        // Days elapsed since the baseline date
        const daysElapsed = differenceInDays(now, latestDate);

        // Define a tolerance inside the system (e.g. 3 days late)
        const toleranceDays = 3; 
        const isOverdue = daysElapsed >= (client.recurrenceDays + toleranceDays);

        if (isOverdue) {
            // Check if we already reminded them in this cycle
            // e.g. If lastReminderDate is within the last (recurrenceDays) period, do not spam them again.
            // A simple approach: only remind them if we haven't reminded them in the last {recurrenceDays} days
            let remindCooldownOver = true;
            if (client.lastReminderDate) {
                const lastReminder = new Date(client.lastReminderDate);
                const daysSinceReminder = differenceInDays(now, lastReminder);
                if (daysSinceReminder < client.recurrenceDays) {
                    remindCooldownOver = false;
                }
            }

            if (remindCooldownOver) {
                console.log(`[CHURN CRON] ⚠️ Client "${client.name}" is overdue: ${daysElapsed} days passed (Recurrence: ${client.recurrenceDays} + 3). Sending reminder...`);
                
                // Format first name nicely
                const firstName = client.name.split(' ')[0];
                const cleanPhone = EvolutionService._formatPhone(client.phone);

                if (cleanPhone) {
                    const messageText = msg.churn.reminder(firstName);
                    
                    try {
                        const remoteJid = `${cleanPhone}@s.whatsapp.net`;
                        await EvolutionService.simulateTypingAndSend(cleanPhone, messageText, remoteJid);
                        
                        // Register that we reminded them today
                        await client.update({ lastReminderDate: now });
                        remindersSent++;
                    } catch (sendError) {
                        console.error(`[CHURN CRON ERROR] Failed to send to ${client.name} (${cleanPhone}):`, sendError.message);
                    }
                }
            }
        }
    }

    console.log(`[CHURN CRON] 📊 Sent reminders to ${remindersSent} clients today.`);
};

// Export both for scheduling and for potential manual triggers
module.exports = { initChurnCron, runChurnCheck };
