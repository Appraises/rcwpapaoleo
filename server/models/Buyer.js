const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Buyer = sequelize.define('Buyer', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'e.g., Granja, Usina, Particular'
    },
    document: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'CPF or CNPJ'
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true
    },
    address: {
        type: DataTypes.STRING,
        allowNull: true
    },
    observations: {
        type: DataTypes.TEXT,
        allowNull: true
    }
});

module.exports = Buyer;
