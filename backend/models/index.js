
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// --- Model Definitions ---

const User = sequelize.define('User', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    username: { type: DataTypes.STRING, unique: true, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('Admin', 'Superadmin'), defaultValue: 'Admin' },
});

const SchoolClass = sequelize.define('SchoolClass', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, unique: true, allowNull: false },
});

const Student = sequelize.define('Student', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nis: { type: DataTypes.STRING, unique: true, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    rfidUid: { type: DataTypes.STRING, unique: true, allowNull: true },
    photoUrl: { type: DataTypes.TEXT('long') },
});

const AttendanceLog = sequelize.define('AttendanceLog', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    studentName: { type: DataTypes.STRING }, // Denormalized for easier reporting
    studentPhotoUrl: { type: DataTypes.TEXT('long') }, // Denormalized
    className: { type: DataTypes.STRING }, // Denormalized
    timestamp: { type: DataTypes.DATE, allowNull: false },
    type: { type: DataTypes.ENUM('in', 'out'), allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false },
});

const Setting = sequelize.define('Setting', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    schoolName: { type: DataTypes.STRING },
    schoolLogoUrl: { type: DataTypes.STRING },
    operatingHours: { type: DataTypes.JSON },
    holidays: { type: DataTypes.JSON },
    manualPin: { type: DataTypes.STRING, defaultValue: '123456' },
});

// --- Associations ---

SchoolClass.hasMany(Student, { foreignKey: 'classId', onDelete: 'SET NULL' });
Student.belongsTo(SchoolClass, { foreignKey: 'classId' });

Student.hasMany(AttendanceLog, { foreignKey: 'studentId', onDelete: 'CASCADE' });
AttendanceLog.belongsTo(Student, { foreignKey: 'studentId' });

module.exports = {
    sequelize,
    User,
    SchoolClass,
    Student,
    AttendanceLog,
    Setting
};