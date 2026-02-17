const { User } = require('./models');
const bcrypt = require('bcryptjs');

const seedUser = async () => {
    try {
        const count = await User.count();
        if (count === 0) {
            console.log('Seeding default user...');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await User.create({
                name: 'Administrador',
                email: 'admin@catoleo.com',
                passwordHash: hashedPassword,
                role: 'admin'
            });
            console.log('Default user created: admin@catoleo.com / admin123');
        }
    } catch (error) {
        console.error('Error seeding user:', error);
    }
};

module.exports = seedUser;
