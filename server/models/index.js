const sequelize = require('../config/database');
const User = require('./User');
const Client = require('./Client');
const Collection = require('./Collection');
const SystemSetting = require('./SystemSetting');
const Address = require('./Address');
const Report = require('./Report');

// Associations
Client.hasOne(Address, { foreignKey: 'clientId', onDelete: 'CASCADE' });
Address.belongsTo(Client, { foreignKey: 'clientId' });

Client.hasMany(Collection, { foreignKey: 'clientId', onDelete: 'CASCADE' });
Collection.belongsTo(Client, { foreignKey: 'clientId' });

User.hasMany(Collection, { foreignKey: 'userId', onDelete: 'SET NULL' });
Collection.belongsTo(User, { foreignKey: 'userId' });

const syncDatabase = async () => {
    try {
        await sequelize.sync();
        console.log('Database synced successfully');
    } catch (error) {
        console.error('Error syncing database:', error);
    }
};

module.exports = {
    User,
    Client,
    Collection,
    SystemSetting,
    Report,
    syncDatabase,
};
