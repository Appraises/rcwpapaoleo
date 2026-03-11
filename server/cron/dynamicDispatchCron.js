const cron = require('node-cron');
const { CollectionRequest, Client, SystemSetting, Address } = require('../models');
const { Op } = require('sequelize');
const { dispatchAdHocUpdates } = require('../services/DispatchService');

async function getSetting(key, defaultValue = null) {
    const setting = await SystemSetting.findByPk(key);
    return setting ? setting.value : defaultValue;
}

const initDynamicDispatchCron = () => {
    // Runs every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
        try {
            console.log('[CRON] 🔄 Checking for Ad-Hoc dynamic dispatch...');
            
            const startHour = await getSetting('dispatch_business_start', '08:00');
            const endHour = await getSetting('dispatch_business_end', '18:00');
            
            const now = new Date();
            const currentTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
            
            // Check if within business hours
            if (currentTime >= startHour && currentTime <= endHour) {
                
                // Get start of today
                const startOfDay = new Date(now);
                startOfDay.setHours(0, 0, 0, 0);

                const pendingRequests = await CollectionRequest.findAll({
                    where: { 
                        status: 'PENDING',
                        createdAt: {
                            [Op.gte]: startOfDay
                        }
                    },
                    include: [{
                        model: Client,
                        include: [{ model: Address }]
                    }],
                    order: [['requestedAt', 'ASC']]
                });

                if (pendingRequests.length > 0) {
                    await dispatchAdHocUpdates(pendingRequests);
                } else {
                    console.log('[CRON] 🔄 Ad-Hoc: No new pending requests to dispatch.');
                }
            } else {
                console.log(`[CRON] 🔄 Ad-Hoc: Outside business hours (${startHour} - ${endHour}). Skipping.`);
            }

        } catch (error) {
            console.error('[CRON ERROR] Failed to run Ad-Hoc dynamic dispatch:', error);
        }
    }, {
        timezone: 'America/Sao_Paulo'
    });
};

module.exports = { initDynamicDispatchCron };
