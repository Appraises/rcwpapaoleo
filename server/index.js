const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

const { syncDatabase } = require('./models');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const clientRoutes = require('./routes/clientRoutes');
const collectionRoutes = require('./routes/collectionRoutes');
const collectionRequestRoutes = require('./routes/collectionRequestRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const authRoutes = require('./routes/authRoutes');
const reportRoutes = require('./routes/reportRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const evolutionRoutes = require('./routes/evolutionRoutes');
const dispatchRoutes = require('./routes/dispatchRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const buyerRoutes = require('./routes/buyerRoutes');
const saleRoutes = require('./routes/saleRoutes');
const authMiddleware = require('./middlewares/authMiddleware');

const seedUser = require('./seed');
const initCronJobs = require('./cron/reportCron');

// Sync Database
syncDatabase().then(() => {
    seedUser();
    initCronJobs();
});

// ── CORS — restrict to allowed origins ──────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map(o => o.trim());

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Bloqueado pela política de CORS'));
    },
    credentials: true,
}));

// ── Rate Limiting ───────────────────────────────────────────────────
// General limiter for all API routes
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,                  // 100 requests per window per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});

// Strict limiter for auth endpoints (login/register)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,                   // 10 attempts per window per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
});

// Webhook limiter (more generous but still bounded)
const webhookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30,                   // 30 requests per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Rate limit exceeded for webhook.' },
});

app.use(express.json());

// Apply general rate limiter to all /api routes
app.use('/api', generalLimiter);

// Public Routes (with specific rate limiters)
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/webhooks', webhookLimiter, webhookRoutes);
app.use('/api/evolution', evolutionRoutes);
app.use('/api/public/reports', express.static(path.join(__dirname, 'public/reports')));

// Global Auth Middleware
app.use(authMiddleware);

// Protected Routes
app.use('/api/clients', clientRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/collection-requests', collectionRequestRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/buyers', buyerRoutes);
app.use('/api/sales', saleRoutes);

app.get('/', (req, res) => {
    res.send('RCW Papa Óleo API is running');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
