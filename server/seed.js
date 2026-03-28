const { User } = require('./models');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const seedUser = async () => {
    try {
        const count = await User.count();
        if (count === 0) {
            const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD;
            if (!defaultPassword) {
                const generated = crypto.randomUUID();
                console.warn('⚠️  ADMIN_DEFAULT_PASSWORD not set in .env. Generated temporary password:', generated);
                console.warn('⚠️  Please set ADMIN_DEFAULT_PASSWORD in your .env file and restart.');
                const hashedPassword = await bcrypt.hash(generated, 10);
                await User.create({
                    name: 'Administrador',
                    email: 'admin@rcwpapaoleo.com',
                    passwordHash: hashedPassword,
                    role: 'admin'
                });
                console.log('✅ Default admin user created. Change the password immediately!');
                return;
            }
            console.log('Seeding default user...');
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);
            await User.create({
                name: 'Administrador',
                email: 'admin@rcwpapaoleo.com',
                passwordHash: hashedPassword,
                role: 'admin'
            });
            console.log('✅ Default admin user created.');
        }
    } catch (error) {
        console.error('Error seeding user:', error);
    }
};

module.exports = seedUser;
