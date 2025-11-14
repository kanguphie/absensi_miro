require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./models');
const seedDatabase = require('./util/seeder');
const apiRoutes = require('./routes/api');

const app = express();

// Middleware
// Updated CORS configuration to explicitly allow requests from any origin.
// This is necessary for the frontend hosted on AI Studio to communicate with this backend.
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
// This assumes you build your React app and place the 'dist' folder here
app.use(express.static(path.join(__dirname, '..', 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3004;

const startServer = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connection has been established successfully.');
        
        // This will create/update tables according to model definitions.
        // { alter: true } tries to alter existing tables to match the models.
        await sequelize.sync({ alter: true });
        console.log('All models were synchronized successfully.');

        // Seed the database with initial data if it's empty
        await seedDatabase();

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Unable to start the server:', error);
    }
};

startServer();