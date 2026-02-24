const { User } = require('../models');
const bcrypt = require('bcryptjs');

exports.createUser = async (req, res) => {
    try {
        const { name, email, password, role, phone, isCollector } = req.body;

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            phone,
            passwordHash: hashedPassword,
            role: role || 'collector',
            isCollector: isCollector !== undefined ? isCollector : true
        });

        res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, isCollector: user.isCollector });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { name, email, role, password, phone, isCollector } = req.body;
        const user = await User.findByPk(req.params.id);

        if (!user) return res.status(404).json({ error: 'User not found' });

        const updates = { name, email, role, phone };
        if (isCollector !== undefined) updates.isCollector = isCollector;

        if (password) {
            updates.passwordHash = await bcrypt.hash(password, 10);
        }

        await user.update(updates);
        res.json({ id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, isCollector: user.isCollector });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (user.email === 'admin@catoleo.com') {
            return res.status(403).json({ error: 'Not allowed to delete the main admin account' });
        }

        await user.destroy();
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
