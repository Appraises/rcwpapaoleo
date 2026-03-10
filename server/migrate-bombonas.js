// server/migrate-bombonas.js
// One-time migration: rename has25L→has20L, has200L→has150L, add has70L and has150L columns
// Run on VPS: node migrate-bombonas.js

const sequelize = require('./config/database');

async function migrate() {
    console.log('[Migration] Starting bombona columns migration...');

    try {
        // Check which columns already exist
        const [columns] = await sequelize.query("PRAGMA table_info('Clients')");
        const colNames = columns.map(c => c.name);
        console.log('[Migration] Existing columns:', colNames.filter(c => c.startsWith('has')).join(', '));

        // 1. Add new columns if they don't exist
        if (!colNames.includes('has20L')) {
            await sequelize.query("ALTER TABLE Clients ADD COLUMN has20L BOOLEAN DEFAULT 0");
            console.log('[Migration] ✅ Added column has20L');
        }
        if (!colNames.includes('has70L')) {
            await sequelize.query("ALTER TABLE Clients ADD COLUMN has70L BOOLEAN DEFAULT 0");
            console.log('[Migration] ✅ Added column has70L');
        }
        if (!colNames.includes('has150L')) {
            await sequelize.query("ALTER TABLE Clients ADD COLUMN has150L BOOLEAN DEFAULT 0");
            console.log('[Migration] ✅ Added column has150L');
        }

        // 2. Migrate data: has25L → has20L, has200L → has150L
        if (colNames.includes('has25L')) {
            const [result] = await sequelize.query("UPDATE Clients SET has20L = has25L WHERE has25L = 1");
            console.log('[Migration] ✅ Migrated has25L → has20L');
        }
        if (colNames.includes('has200L')) {
            const [result] = await sequelize.query("UPDATE Clients SET has150L = has200L WHERE has200L = 1");
            console.log('[Migration] ✅ Migrated has200L → has150L');
        }

        // 3. Note: SQLite doesn't support DROP COLUMN in older versions.
        // The old columns (has25L, has200L) will remain but be ignored by Sequelize
        // since they're no longer in the model definition.
        console.log('[Migration] ℹ️  Old columns (has25L, has200L) will be ignored by Sequelize (not in model).');

        console.log('[Migration] ✅ Migration complete!');
    } catch (error) {
        console.error('[Migration] ❌ Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

migrate();
