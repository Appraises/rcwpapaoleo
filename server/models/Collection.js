const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Collection = sequelize.define('Collection', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    quantity: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    observation: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    isTrocaDescarte: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'When true, no acquisition cost is applied for this collection'
    },
});

module.exports = Collection;
