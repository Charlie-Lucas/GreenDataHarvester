const express = require('express');
const router = express.Router();

// @route   GET /api/profiles
// @desc    Placeholder route for profiles
// @access  Public
router.get('/', (req, res) => {
  res.json({ message: 'Profiles endpoint' });
});

module.exports = router;
