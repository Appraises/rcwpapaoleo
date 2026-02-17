const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Address = sequelize.define('Address', {
    street: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    number: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    district: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    city: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    state: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    zip: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    reference: {
        type: DataTypes.STRING,
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

module.exports = Address;
