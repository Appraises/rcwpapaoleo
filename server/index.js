const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const { syncDatabase } = require('./models');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const clientRoutes = require('./routes/clientRoutes');
const collectionRoutes = require('./routes/collectionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const authRoutes = require('./routes/authRoutes');
// const authMiddleware = require('./middlewares/authMiddleware'); // Uncomment to protect routes globally or use in specific routes

const seedUser = require('./seed');

// Sync Database
syncDatabase().then(() => {
    seedUser();
});

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/', (req, res) => {
    res.send('CatÓleo API is running');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
