const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Sale = sequelize.define('Sale', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    buyerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Buyers', // Should match table name, Sequelize converts Buyer to Buyers
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    quantityLiters: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    pricePerLiter: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    totalValue: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    observations: {
        type: DataTypes.TEXT,
        allowNull: true
    }
});

module.exports = Sale;
