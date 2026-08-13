const express = require('express');

function createFocusListRouter(pool) {
  const router = express.Router();

  // 查询关注列表
  router.get('/', async (req, res) => {
    try {
      const [rows] = await pool.query(
        'SELECT code, created_at FROM focusList ORDER BY created_at DESC'
      );
      res.json({ code: 200, data: rows });
    } catch (err) {
      res.status(500).json({ code: 500, message: err.message });
    }
  });

  // 新增关注
  router.post('/', async (req, res) => {
    const { code } = req.body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ code: 400, message: '股票代码 code 不能为空' });
    }

    const stockCode = code.trim();

    try {
      await pool.query(
        'INSERT INTO focusList (code, created_at) VALUES (?, NOW())',
        [stockCode]
      );

      res.status(201).json({
        code: 201,
        message: '关注成功',
        data: { code: stockCode }
      });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ code: 409, message: '该股票已在关注列表中' });
      }
      res.status(500).json({ code: 500, message: err.message });
    }
  });

  // 取消关注
  router.delete('/:code', async (req, res) => {
    const { code } = req.params;

    if (!code || !code.trim()) {
      return res.status(400).json({ code: 400, message: '股票代码 code 不能为空' });
    }

    try {
      const [result] = await pool.query(
        'DELETE FROM focusList WHERE code = ?',
        [code.trim()]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ code: 404, message: '关注记录未找到' });
      }
      res.json({ code: 200, message: '取消关注成功' });
    } catch (err) {
      res.status(500).json({ code: 500, message: err.message });
    }
  });

  return router;
}

module.exports = createFocusListRouter;
