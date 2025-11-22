require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./models');
const seedDatabase = require('./util/seeder');
const apiRoutes = require('./routes/api');
const initScheduler = require('./cron/scheduler'); // Import Scheduler

const app = express();

// Middleware
// Updated CORS configuration to explicitly allow requests from any origin.
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allow common methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow necessary headers
}));
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api', apiRoutes);

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3004;

const startServer = async () => {
    // 1. Start HTTP Server immediately so aaPanel sees the process as "Running"
    const server = app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });

    // 2. Attempt Database Connection asynchronously
    try {
        await sequelize.authenticate();
        console.log('Database connection has been established successfully.');
        
        // 3. Attempt Sync
        // Note: { alter: true } can sometimes fail in production if table structures conflict.
        // We wrap this in a nested try-catch so the server process DOES NOT EXIT if sync fails.
        try {
            await sequelize.sync({ alter: true });
            console.log('All models were synchronized successfully.');
            
            // 4. Seed Data
            await seedDatabase();

            // 5. Start Scheduler (Automation)
            initScheduler();
            
        } catch (syncError) {
            console.error('---------------------------------------------------');
            console.error('CRITICAL DATABASE ERROR (SYNC/SEED):');
            console.error(syncError);
            console.error('---------------------------------------------------');
            console.error('The server is still running, but database features may fail.');
        }

    } catch (error) {
        console.error('---------------------------------------------------');
        console.error('FATAL: Unable to connect to the database:');
        console.error(error);
        console.error('---------------------------------------------------');
    }
};

startServer();