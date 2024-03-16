const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(bodyParser.json());

// Connect to PostgreSQL
const pool = new Pool({
    connectionString: process.env.PG_CONNECTION_STRING,
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

// Function to create the 'servers' table if it doesn't exist
const createServersTable = async () => {
    try {
        const result = await pool.query(
            `
            CREATE TABLE IF NOT EXISTS servers (
                id SERIAL PRIMARY KEY,
                server_id VARCHAR(255) NOT NULL,
                timestamp TIMESTAMP NOT NULL,
                ip VARCHAR(45) NOT NULL
            );
        `
        );
        console.log('Servers table created or already exists');
    } catch (error) {
        console.error('Error creating servers table:', error.message);
    }
};

// Create the 'servers' table if it doesn't exist
createServersTable();

// Phone home API endpoint
app.get('/phone-home', async (req, res) => {
    const serverId = req.query.serverId;

    if (!serverId) {
        return res.status(400).json({ message: 'Missing required serverId parameter' });
    }

    const timestamp = new Date().toISOString();
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    try {
        await pool.query(
            'INSERT INTO servers (server_id, timestamp, ip) VALUES ($1, $2, $3)',
            [serverId, timestamp, ip]
        );
        res.status(200).json({ message: 'Phone home successful' });
    } catch (error) {
        console.error('Error saving phone home data:', error.message);
        res.status(500).json({ message: 'Error saving phone home data' });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
