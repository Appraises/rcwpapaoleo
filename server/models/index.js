const sequelize = require('../config/database');
const User = require('./User');
const Client = require('./Client');
const Collection = require('./Collection');
const SystemSetting = require('./SystemSetting');
const Address = require('./Address');
const Report = require('./Report');
const CollectionRequest = require('./CollectionRequest');
const ClientPhone = require('./ClientPhone');
const Buyer = require('./Buyer');
const Sale = require('./Sale');

// Associations
Client.hasOne(Address, { foreignKey: 'clientId', onDelete: 'CASCADE' });
Address.belongsTo(Client, { foreignKey: 'clientId' });

Client.hasMany(ClientPhone, { foreignKey: 'clientId', onDelete: 'CASCADE', as: 'additionalPhones' });
ClientPhone.belongsTo(Client, { foreignKey: 'clientId' });

Client.hasMany(Collection, { foreignKey: 'clientId', onDelete: 'CASCADE' });
Collection.belongsTo(Client, { foreignKey: 'clientId' });

User.hasMany(Collection, { foreignKey: 'userId', onDelete: 'SET NULL' });
Collection.belongsTo(User, { foreignKey: 'userId' });

Client.hasMany(CollectionRequest, { foreignKey: 'clientId', onDelete: 'CASCADE' });
CollectionRequest.belongsTo(Client, { foreignKey: 'clientId' });

// Sales Associations
Buyer.hasMany(Sale, { foreignKey: 'buyerId', onDelete: 'CASCADE' });
Sale.belongsTo(Buyer, { foreignKey: 'buyerId' });

const syncDatabase = async () => {
    try {
        // Disable foreign keys temporarily for SQLite 'alter: true' compatibility
        await sequelize.query('PRAGMA foreign_keys = OFF;');
        await sequelize.sync({ alter: true });
        await sequelize.query('PRAGMA foreign_keys = ON;');
        console.log('✅ Database synced successfully');
    } catch (error) {
        console.error('❌ Error syncing database:', error.message);
        console.error('Full sync error:', error);
    }
};

module.exports = {
    User,
    Client,
    Collection,
    SystemSetting,
    Address,
    Report,
    CollectionRequest,
    ClientPhone,
    Buyer,
    Sale,
    syncDatabase,
};
