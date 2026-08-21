const express = require('express');

function createFocusListRouter(pool) {
  const router = express.Router();

  // 查询关注列表（按 userId）
  router.get('/', async (req, res) => {
    const uid = Number(req.query.userId);

    if (!req.query.userId || !Number.isInteger(uid) || uid <= 0) {
      return res.status(400).json({ code: 400, message: 'userId 不能为空且须为正整数' });
    }

    try {
      const [rows] = await pool.query(
        'SELECT code, created_at, userId FROM focusList WHERE userId = ? ORDER BY created_at DESC',
        [uid]
      );
      res.json({ code: 200, data: rows });
    } catch (err) {
      res.status(500).json({ code: 500, message: err.message });
    }
  });

  // 新增关注
  router.post('/', async (req, res) => {
    const { code, userId } = req.body;
    const uid = Number(userId);

    if (!userId || !Number.isInteger(uid) || uid <= 0) {
      return res.status(400).json({ code: 400, message: 'userId 不能为空且须为正整数' });
    }

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ code: 400, message: '基金代码 code 不能为空' });
    }

    const stockCode = code.trim();

    try {
      await pool.query(
        'INSERT INTO focusList (code, created_at, userId) VALUES (?, NOW(), ?)',
        [stockCode, uid]
      );

      res.status(201).json({
        code: 201,
        message: '关注成功',
        data: { code: stockCode, userId: uid }
      });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ code: 409, message: '该基金已在关注列表中' });
      }
      res.status(500).json({ code: 500, message: err.message });
    }
  });

  // 取消关注
  router.delete('/:code', async (req, res) => {
    const { code } = req.params;
    const uid = Number(req.body.userId ?? req.query.userId);

    if (!req.body.userId && !req.query.userId) {
      return res.status(400).json({ code: 400, message: 'userId 不能为空且须为正整数' });
    }

    if (!Number.isInteger(uid) || uid <= 0) {
      return res.status(400).json({ code: 400, message: 'userId 不能为空且须为正整数' });
    }

    if (!code || !code.trim()) {
      return res.status(400).json({ code: 400, message: '基金代码 code 不能为空' });
    }

    try {
      const [result] = await pool.query(
        'DELETE FROM focusList WHERE code = ? AND userId = ?',
        [code.trim(), uid]
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
