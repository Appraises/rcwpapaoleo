const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

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
// const authMiddleware = require('./middlewares/authMiddleware'); // Uncomment to protect routes globally or use in specific routes

const seedUser = require('./seed');
const initCronJobs = require('./cron/reportCron');

// Sync Database
syncDatabase().then(() => {
    seedUser();
    initCronJobs();
});

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/collection-requests', collectionRequestRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/evolution', evolutionRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/public/reports', express.static(path.join(__dirname, 'public/reports')));

app.get('/', (req, res) => {
    res.send('Cat Óleo API is running');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
