const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ClientPhone = sequelize.define('ClientPhone', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    clientId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Clients',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false,
    }
});

module.exports = ClientPhone;
