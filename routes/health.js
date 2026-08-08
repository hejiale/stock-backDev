const express = require('express');

function createHealthRouter() {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json({ code: 200, message: 'ok' });
  });

  return router;
}

module.exports = createHealthRouter;
