const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CollectionRequest = sequelize.define('CollectionRequest', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    // We will associate with Client, so clientId will be added automatically,
    // but defining explicitly helps with validations
    clientId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'DISPATCHED', 'COMPLETED', 'CANCELLED'),
        defaultValue: 'PENDING',
        allowNull: false,
    },
    assignedTo: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    dispatchOrder: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    priority: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
    },
    requestedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
    }
});

module.exports = CollectionRequest;
