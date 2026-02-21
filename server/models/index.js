const sequelize = require('../config/database');
const User = require('./User');
const Client = require('./Client');
const Collection = require('./Collection');
const SystemSetting = require('./SystemSetting');
const Address = require('./Address');
const Report = require('./Report');
const CollectionRequest = require('./CollectionRequest');

// Associations
Client.hasOne(Address, { foreignKey: 'clientId', onDelete: 'CASCADE' });
Address.belongsTo(Client, { foreignKey: 'clientId' });

Client.hasMany(Collection, { foreignKey: 'clientId', onDelete: 'CASCADE' });
Collection.belongsTo(Client, { foreignKey: 'clientId' });

User.hasMany(Collection, { foreignKey: 'userId', onDelete: 'SET NULL' });
Collection.belongsTo(User, { foreignKey: 'userId' });

Client.hasMany(CollectionRequest, { foreignKey: 'clientId', onDelete: 'CASCADE' });
CollectionRequest.belongsTo(Client, { foreignKey: 'clientId' });

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
    CollectionRequest,
    syncDatabase,
};
