const express = require('express');

const VALID_TYPES = [1, 2, 3, 4, 5]; // 1 A股 2 美股 3 港股 4 韩股 5 日股

function createStockRouter(pool) {
  const router = express.Router();

  // 新增股票
  router.post('/addStock', async (req, res) => {
    const { code, type, userId } = req.body;
    const stockType = Number(type);
    const uid = Number(userId);

    if (!userId || !Number.isInteger(uid) || uid <= 0) {
      return res.status(400).json({ code: 400, message: 'userId 不能为空且须为正整数' });
    }

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ code: 400, message: '股票代码 code 不能为空' });
    }

    if (!VALID_TYPES.includes(stockType)) {
      return res.status(400).json({
        code: 400,
        message: 'type 无效，可选值：1 A股、2 美股、3 港股、4 韩股、5 日股'
      });
    }

    const stockCode = code.trim();

    try {
      const [existing] = await pool.query(
        'SELECT code FROM aStock WHERE code = ? AND userId = ? LIMIT 1',
        [stockCode, uid]
      );
      if (existing.length > 0) {
        return res.status(409).json({ code: 409, message: '该股票已存在，请勿重复添加' });
      }

      await pool.query(
        'INSERT INTO aStock (code, type, userId) VALUES (?, ?, ?)',
        [stockCode, stockType, uid]
      );

      res.status(201).json({
        code: 201,
        message: '添加成功',
        data: { code: stockCode, type: stockType, userId: uid }
      });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ code: 409, message: '该股票已存在，请勿重复添加' });
      }
      res.status(500).json({ code: 500, message: err.message });
    }
  });

  // 查询列表（按 type + userId）
  router.get('/', async (req, res) => {
    const stockType = Number(req.query.type);
    const uid = Number(req.query.userId);

    if (!req.query.userId || !Number.isInteger(uid) || uid <= 0) {
      return res.status(400).json({ code: 400, message: 'userId 不能为空且须为正整数' });
    }

    if (!VALID_TYPES.includes(stockType)) {
      return res.status(400).json({
        code: 400,
        message: 'type 无效，可选值：1 A股、2 美股、3 港股、4 韩股、5 日股'
      });
    }

    try {
      const [rows] = await pool.query(
        'SELECT * FROM aStock WHERE type = ? AND userId = ?',
        [stockType, uid]
      );
      res.json({ code: 200, data: rows });
    } catch (err) {
      res.status(500).json({ code: 500, message: err.message });
    }
  });

  // 删除股票
  router.delete('/deleteStock/:code', async (req, res) => {
    const { code } = req.params;
    const uid = Number(req.body.userId ?? req.query.userId);

    if (!req.body.userId && !req.query.userId) {
      return res.status(400).json({ code: 400, message: 'userId 不能为空且须为正整数' });
    }

    if (!Number.isInteger(uid) || uid <= 0) {
      return res.status(400).json({ code: 400, message: 'userId 不能为空且须为正整数' });
    }

    if (!code || !code.trim()) {
      return res.status(400).json({ code: 400, message: '股票代码 code 不能为空' });
    }

    try {
      const [result] = await pool.query(
        'DELETE FROM aStock WHERE code = ? AND userId = ?',
        [code.trim(), uid]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ code: 404, message: '股票记录未找到' });
      }
      res.json({ code: 200, message: '删除成功' });
    } catch (err) {
      res.status(500).json({ code: 500, message: err.message });
    }
  });

  return router;
}

module.exports = createStockRouter;
