const express = require('express');
require('dotenv').config();

const identifyRoute = require('./routes/identify');

const app = express();
app.use(express.json());

app.use('/identify', identifyRoute);

app.get('/', (req, res) => {
  res.send("Server is running 🚀");
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});

app.get('/init-db', async (req, res) => {
  try {
    const db = require('./db');

    await db.query(`
      CREATE TABLE IF NOT EXISTS Contact (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phoneNumber VARCHAR(20),
        email VARCHAR(255),
        linkedId INT,
        linkPrecedence ENUM('primary', 'secondary') NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deletedAt DATETIME
      );
    `);

    res.send("Contact table created successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating table");
  }
});