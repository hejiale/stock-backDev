const express = require('express');

function createUsersRouter(pool) {
  const router = express.Router();

  // 查询用户列表
  router.get('/', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT id, name, created_at FROM users');
      res.json({ code: 200, data: rows });
    } catch (err) {
      res.status(500).json({ code: 500, message: err.message });
    }
  });

  // 用户注册
  router.post('/register', async (req, res) => {
    const { name, password } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ code: 400, message: '用户名 name 不能为空' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ code: 400, message: '密码 password 不能为空' });
    }

    const username = name.trim();

    try {
      const [result] = await pool.query(
        'INSERT INTO users (name, password) VALUES (?, ?)',
        [username, password]
      );

      res.status(201).json({
        code: 201,
        message: '注册成功',
        data: { id: result.insertId, name: username }
      });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ code: 409, message: '用户名已存在' });
      }
      res.status(500).json({ code: 500, message: err.message });
    }
  });

  // 用户登录
  router.post('/login', async (req, res) => {
    const { name, password } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ code: 400, message: '用户名 name 不能为空' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ code: 400, message: '密码 password 不能为空' });
    }

    try {
      const [rows] = await pool.query(
        'SELECT id, name, created_at FROM users WHERE name = ? AND password = ? LIMIT 1',
        [name.trim(), password]
      );

      if (rows.length === 0) {
        return res.status(401).json({ code: 401, message: '用户名或密码错误' });
      }

      res.json({
        code: 200,
        message: '登录成功',
        data: rows[0]
      });
    } catch (err) {
      res.status(500).json({ code: 500, message: err.message });
    }
  });

  return router;
}

module.exports = createUsersRouter;
