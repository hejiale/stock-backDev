const express = require('express');

function createUsersRouter(pool) {
  const router = express.Router();

  // 查询用户列表
  router.get('/', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM users');
      res.json({ code: 200, data: rows });
    } catch (err) {
      res.status(500).json({ code: 500, message: err.message });
    }
  });

  return router;
}

module.exports = createUsersRouter;
