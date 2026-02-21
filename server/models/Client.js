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
        allowNull: false,
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
});

module.exports = Client;
