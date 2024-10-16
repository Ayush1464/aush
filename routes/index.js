const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Test route to get data from the database
router.get('/users', (req, res) => {
  const sql = 'SELECT * FROM users'; // Replace with your table name
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).send('Database query failed');
    }
    res.json(results);
  });
});

module.exports = router;
