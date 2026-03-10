const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Client = sequelize.define('Client', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    tradeName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    document: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    address: {
        type: DataTypes.STRING,
        allowNull: true, // Deprecated, keeping for legacy
    },
    street: { type: DataTypes.STRING, allowNull: true },
    number: { type: DataTypes.STRING, allowNull: true },
    district: { type: DataTypes.STRING, allowNull: true },
    city: { type: DataTypes.STRING, allowNull: true },
    state: { type: DataTypes.STRING, allowNull: true },
    zip: { type: DataTypes.STRING, allowNull: true },
    reference: { type: DataTypes.STRING, allowNull: true },
    pricePerLiter: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
        allowNull: false
    },
    averageOilLiters: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
        allowNull: false
    },
    observations: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    latitude: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    longitude: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    has20L: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    has50L: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    has70L: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    has100L: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    has150L: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    recurrenceDays: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Interval in days between expected collections'
    },
    lastReminderDate: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Date when the last churn memory was sent'
    }
});

module.exports = Client;
