const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// Define path to the SQLite database
const dbPath = path.join(__dirname, '..', 'database.sqlite');

const backupDatabase = async () => {
    try {
        console.log('[BACKUP] 🚀 Iniciando backup do banco de dados para o Telegram...');

        // 1. Check if database exists
        if (!fs.existsSync(dbPath)) {
            console.warn('[BACKUP WARNING] Arquivo database.sqlite não encontrado. Backup abortado.');
            return { success: false, message: 'Database file not found.' };
        }

        // 2. Load configurations from .env
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        if (!botToken || !chatId) {
            console.warn('[BACKUP WARNING] Variáveis TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não configuradas no .env. Backup abortado.');
            return { success: false, message: 'Telegram credentials not configured.' };
        }

        // 3. Prepare file metadata
        const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
        const fileName = `rcwpapaoleo_backup_${dateStr}_${timeStr}.sqlite`;

        // 4. Create FormData payload
        const form = new FormData();
        form.append('chat_id', chatId);
        form.append('document', fs.createReadStream(dbPath), {
            filename: fileName,
            contentType: 'application/vnd.sqlite3',
        });

        let caption = `📦 *Backup Automático Concluído*\n\n`;
        caption += `📅 Data: ${dateStr}\n`;
        caption += `⏰ Hora: ${new Date().toTimeString().split(' ')[0]}\n`;
        caption += `💾 Arquivo: \`${fileName}\``;

        form.append('caption', caption);
        form.append('parse_mode', 'Markdown');

        // 5. Send to Telegram API
        const telegramUrl = `https://api.telegram.org/bot${botToken}/sendDocument`;

        console.log(`[BACKUP] Enviando arquivo ${fileName} para o Telegram (Chat ID: ${chatId})...`);

        const response = await axios.post(telegramUrl, form, {
            headers: {
                ...form.getHeaders()
            }
        });

        if (response.data.ok) {
            console.log(`[BACKUP] ✅ Backup enviado com sucesso para o Telegram!`);
            return { success: true, fileName: fileName };
        } else {
            console.error(`[BACKUP] ❌ Erro retornado pela API do Telegram:`, response.data);
            return { success: false, message: 'Telegram API returned an error.' };
        }

    } catch (error) {
        console.error('[BACKUP ERROR] ❌ Falha ao enviar backup para o Telegram:', error.message);
        return { success: false, message: error.message };
    }
};

module.exports = {
    backupDatabase
};
