const mysql = require('mysql');
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.localhost,
  user: process.env.root,
  password: process.env.root,
  database: process.env.oms,
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err.message);
    return;
  }
  console.log('Connected to MySQL Database');
});

module.exports = db;
