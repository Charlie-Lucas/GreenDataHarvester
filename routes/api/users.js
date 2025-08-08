const express = require('express');
const router = express.Router();

// @route   GET /api/users
// @desc    Placeholder route for users
// @access  Public
router.get('/', (req, res) => {
  res.json({ message: 'Users endpoint' });
});

module.exports = router;
