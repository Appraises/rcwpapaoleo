const cron = require('node-cron');
const { CollectionRequest, Client, User, SystemSetting, Address } = require('../models');
const { Op } = require('sequelize');
const EvolutionService = require('../services/EvolutionService');
const msg = require('../utils/MessageVariation');
const { format } = require('date-fns');

async function getSetting(key, defaultValue = null) {
    const setting = await SystemSetting.findByPk(key);
    return setting ? setting.value : defaultValue;
}

const initConsolidatedListCron = () => {
    // Runs every minute to match the exact consolidated time
    cron.schedule('* * * * *', async () => {
        try {
            const consolidatedTime = await getSetting('dispatch_business_end', '18:00');
            
            const now = new Date();
            const currentTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
            
            if (currentTime === consolidatedTime) {
                console.log(`[CRON] 📋 Time is ${currentTime}. Generating Consolidated Daily Lists for collectors...`);
                
                const startOfDay = new Date(now);
                startOfDay.setHours(0, 0, 0, 0);

                // Fetch all dispatched requests of the day
                const dispatchedRequests = await CollectionRequest.findAll({
                    where: { 
                        updatedAt: {
                            [Op.gte]: startOfDay
                        },
                        assignedTo: {
                            [Op.ne]: null
                        }
                    },
                    include: [{
                        model: Client,
                        attributes: ['name', 'street', 'number', 'district'],
                        include: [{ model: Address }]
                    }],
                    order: [['assignedTo', 'ASC'], ['dispatchOrder', 'ASC']]
                });

                if (dispatchedRequests.length === 0) {
                    console.log('[CRON] 📋 No active requests found today to consolidate.');
                    return;
                }

                // Group by collector
                const byCollector = {};
                for (const req of dispatchedRequests) {
                    if (!byCollector[req.assignedTo]) {
                        byCollector[req.assignedTo] = [];
                    }
                    byCollector[req.assignedTo].push(req);
                }

                const todayStr = format(now, 'dd/MM/yyyy');

                for (const collectorId of Object.keys(byCollector)) {
                    const collector = await User.findByPk(collectorId);
                    if (!collector || !collector.phone) continue;

                    const reqs = byCollector[collectorId];
                    // Sort by array
                    reqs.sort((a,b) => (a.dispatchOrder || Number.MAX_SAFE_INTEGER) - (b.dispatchOrder || Number.MAX_SAFE_INTEGER));

                    const lines = [];
                    lines.push(msg.consolidatedList.header(todayStr));
                    
                    reqs.forEach((req, idx) => {
                        const client = req.Client;
                        const addr = client?.Address || client;
                        const num = req.dispatchOrder || (idx + 1);
                        const statusIcon = req.status === 'COMPLETED' ? '✅' : (req.status === 'CANCELLED' ? '❌' : '⏳');
                        
                        const addrParts = [addr?.street, addr?.number].filter(Boolean).join(', ');
                        const dist = addr?.district ? ` — ${addr.district}` : '';
                        
                        lines.push(`*${num}.* [${statusIcon}] ${client?.name || 'Desconhecido'}`);
                        lines.push(`   📍 ${addrParts}${dist}`);
                    });

                    lines.push('\n_Bom fim de expediente!_ 💚♻️');

                    const finalMessage = lines.join('\n');
                    const remoteJid = `${EvolutionService._formatPhone(collector.phone)}@s.whatsapp.net`;
                    await EvolutionService.simulateTypingAndSend(collector.phone, finalMessage, remoteJid);
                    
                    console.log(`[CRON] 📋 Sent consolidated list to ${collector.name}`);
                }
            }
        } catch (error) {
            console.error('[CRON ERROR] Failed to run consolidated list cron:', error);
        }
    }, {
        timezone: 'America/Sao_Paulo'
    });
};

module.exports = { initConsolidatedListCron };
