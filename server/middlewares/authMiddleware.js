const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2) {
        return res.status(401).json({ error: 'Token error' });
    }

    const [scheme, token] = parts;

    if (!/^Bearer$/i.test(scheme)) {
        return res.status(401).json({ error: 'Token malformatted' });
    }

    if (!process.env.JWT_SECRET) {
        console.error('CRITICAL: JWT_SECRET is not defined in environment variables.');
        return res.status(500).json({ error: 'Internal server configuration error' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Token invalid' });

        req.userId = decoded.id;
        req.userRole = decoded.role;
        return next();
    });
};

const requireAdmin = (req, res, next) => {
    if (req.userRole !== 'admin') {
        return res.status(403).json({ error: 'Acesso restrito a administradores' });
    }
    return next();
};

module.exports = authenticate;
module.exports.requireAdmin = requireAdmin;
