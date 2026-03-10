const { Client, syncDatabase } = require('./server/models');
const { Op } = require('sequelize');

async function fixEmptyStrings() {
    await syncDatabase();
    
    // Find all clients with empty string as document
    const clients = await Client.findAll({
        where: {
            document: {
                [Op.or]: ['', ' ']
            }
        }
    });

    console.log(`[Fix] Found ${clients.length} clients with empty string document`);

    for (const c of clients) {
        await c.update({ document: null });
        console.log(`[Fix] Updated Client ID ${c.id} document to NULL`);
    }

    process.exit(0);
}

fixEmptyStrings();
