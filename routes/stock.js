const express = require('express');

const VALID_TYPES = [1, 2, 3, 4]; // 1 A股 2 美股 3 港股 4 韩股

function createStockRouter(pool) {
  const router = express.Router();

  // 新增股票
  router.post('/addStock', async (req, res) => {
    const { code, type } = req.body;
    const stockType = Number(type);

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ code: 400, message: '股票代码 code 不能为空' });
    }

    if (!VALID_TYPES.includes(stockType)) {
      return res.status(400).json({
        code: 400,
        message: 'type 无效，可选值：1 A股、2 美股、3 港股、4 韩股'
      });
    }

    const stockCode = code.trim();

    try {
      await pool.query('INSERT INTO aStock (code, type) VALUES (?, ?)', [stockCode, stockType]);

      res.status(201).json({
        code: 201,
        message: '添加成功',
        data: { code: stockCode, type: stockType }
      });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ code: 409, message: '该股票已存在' });
      }
      res.status(500).json({ code: 500, message: err.message });
    }
  });

  // 查询列表（按 type）
  router.get('/', async (req, res) => {
    const stockType = Number(req.query.type);

    if (!VALID_TYPES.includes(stockType)) {
      return res.status(400).json({
        code: 400,
        message: 'type 无效，可选值：1 A股、2 美股、3 港股、4 韩股'
      });
    }

    try {
      const [rows] = await pool.query('SELECT * FROM aStock WHERE type = ?', [stockType]);
      res.json({ code: 200, data: rows });
    } catch (err) {
      res.status(500).json({ code: 500, message: err.message });
    }
  });

  // 删除股票
  router.delete('/deleteStock/:code', async (req, res) => {
    const { code } = req.params;

    if (!code || !code.trim()) {
      return res.status(400).json({ code: 400, message: '股票代码 code 不能为空' });
    }

    try {
      const [result] = await pool.query('DELETE FROM aStock WHERE code = ?', [code.trim()]);
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
