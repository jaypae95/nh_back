module.exports = (sequelize, DataTypes) => {
    return sequelize.define('breakdown', {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            autoIncrement: true,
            primaryKey: true,
        },
        event_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        sender_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        sender_name: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        transfer_datetime: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        message: {
            type: DataTypes.STRING(45),
            allowNull: true,
            defaultValue: null,
        },
        money: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        is_direct_input: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
    },
    {
        timestamps: false,
    });
};
