const bcrypt = require('bcryptjs');
const { User, Setting, SchoolClass, Student } = require('../models');
const { initialSettings, initialClasses, initialStudents, initialAdmin } = require('./initialData');

const seedDatabase = async () => {
    try {
        // Seed User
        const userCount = await User.count();
        if (userCount === 0) {
            console.log('No users found, seeding admin user...');
            const hashedPassword = bcrypt.hashSync(initialAdmin.password, 10);
            await User.create({ ...initialAdmin, password: hashedPassword });
            console.log('Admin user created.');
        }

        // Seed Settings
        const settingsCount = await Setting.count();
        if (settingsCount === 0) {
            console.log('No settings found, seeding initial settings...');
            await Setting.create(initialSettings);
            console.log('Initial settings created.');
        }

        // Seed Classes
        const classCount = await SchoolClass.count();
        if (classCount === 0) {
            console.log('No classes found, seeding initial classes...');
            await SchoolClass.bulkCreate(initialClasses);
            console.log('Initial classes created.');
        }

        // Seed Students
        const studentCount = await Student.count();
        if (studentCount === 0) {
            console.log('No students found, seeding initial students...');
            // We need to map class names to the newly created class IDs
            const classes = await SchoolClass.findAll();
            const classMap = classes.reduce((acc, cur) => {
                acc[cur.name] = cur.id;
                return acc;
            }, {});

            const studentsToCreate = initialStudents.map(student => ({
                ...student,
                classId: classMap[student.className]
            }));

            await Student.bulkCreate(studentsToCreate);
            console.log('Initial students created.');
        }

    } catch (error) {
        console.error('Error seeding database:', error);
    }
};

module.exports = seedDatabase;
