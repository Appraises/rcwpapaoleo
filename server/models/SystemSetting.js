const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SystemSetting = sequelize.define('SystemSetting', {
    key: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
    },
    value: {
        type: DataTypes.STRING,
        allowNull: false,
    },
});

module.exports = SystemSetting;
