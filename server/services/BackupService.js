const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// Define path to the SQLite database and the Google credentials file
const dbPath = path.join(__dirname, '..', 'database.sqlite');
const credentialsPath = path.join(__dirname, '..', 'drive-credentials.json');

const backupDatabase = async () => {
    try {
        console.log('[BACKUP] 🚀 Iniciando backup do banco de dados para o Google Drive...');

        // 1. Check if database exists
        if (!fs.existsSync(dbPath)) {
            console.warn('[BACKUP WARNING] Arquivo database.sqlite não encontrado. Backup abortado.');
            return { success: false, message: 'Database file not found.' };
        }

        // 2. Check if credentials file exists
        if (!fs.existsSync(credentialsPath)) {
            console.warn('[BACKUP WARNING] Arquivo drive-credentials.json não encontrado. Backup abortado.');
            return { success: false, message: 'Google Drive credentials not found.' };
        }

        // 3. Ensure folder ID is configured in .env
        const folderId = process.env.DRIVE_BACKUP_FOLDER_ID;
        if (!folderId) {
            console.warn('[BACKUP WARNING] Variável DRIVE_BACKUP_FOLDER_ID não configurada no .env. Backup abortado.');
            return { success: false, message: 'DRIVE_BACKUP_FOLDER_ID not configured.' };
        }

        // 4. Authenticate with Google API
        const auth = new google.auth.GoogleAuth({
            keyFile: credentialsPath,
            scopes: ['https://www.googleapis.com/auth/drive.file'],
        });

        const drive = google.drive({ version: 'v3', auth });

        // 5. Prepare file metadata
        const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
        const fileName = `catoleo_backup_${dateStr}_${timeStr}.sqlite`;

        const fileMetadata = {
            name: fileName,
            parents: [folderId]
        };

        const media = {
            mimeType: 'application/vnd.sqlite3',
            body: fs.createReadStream(dbPath)
        };

        // 6. Upload file to Google Drive
        console.log(`[BACKUP] Fazendo upload do arquivo ${fileName} para a pasta ${folderId}...`);
        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, name'
        });

        console.log(`[BACKUP] ✅ Backup concluído com sucesso! ID no Drive: ${response.data.id}`);
        return { success: true, fileId: response.data.id, fileName: response.data.name };

    } catch (error) {
        console.error('[BACKUP ERROR] ❌ Falha ao realizar backup do banco de dados:', error);
        return { success: false, message: error.message };
    }
};

module.exports = {
    backupDatabase
};
