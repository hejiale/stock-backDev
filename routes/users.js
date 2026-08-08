const express = require('express');

function createUsersRouter(pool) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM users ORDER BY id DESC');
      res.json({ code: 200, data: rows });
    } catch (err) {
      res.status(500).json({ code: 500, message: err.message });
    }
  });

  router.post('/', async (req, res) => {
    const { username, email } = req.body;

    if (!username || !email) {
      return res.status(400).json({ code: 400, message: '用户名和邮箱不能为空' });
    }

    try {
      const sql = 'INSERT INTO users (username, email) VALUES (?, ?)';
      const [result] = await pool.query(sql, [username, email]);

      res.status(201).json({
        code: 201,
        message: '创建成功',
        data: { id: result.insertId, username, email }
      });
    } catch (err) {
      res.status(500).json({ code: 500, message: err.message });
    }
  });

  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ code: 404, message: '用户未找到' });
      }
      res.json({ code: 200, message: '删除成功' });
    } catch (err) {
      res.status(500).json({ code: 500, message: err.message });
    }
  });

  return router;
}

module.exports = createUsersRouter;
