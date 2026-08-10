const express = require('express');
const {
  parseHoldings,
  loadQuotes,
  loadStockMarketCap,
  loadStockProfile,
  loadIntradayTrends,
  loadDailyKlines,
  calcPeriodReturns,
  sliceKlinesForRange,
  resolveStock,
  loadCnSectorBoards,
  loadCnSectorStocks,
  loadCnIndices,
  loadUsIndices,
  loadUsSectorBoards,
  loadUsStockRank
} = require('../services/eastMoney');

/**
 * 从 query / body 解析单个持仓 { code, market?, name? }
 */
function pickHolding(req) {
  const src = { ...req.query, ...(req.body || {}) };
  const code = src.code != null ? String(src.code).trim() : '';
  if (!code) return null;
  const holding = { code };
  if (src.market != null && src.market !== '') {
    holding.market = Number(src.market);
  }
  if (src.name) holding.name = String(src.name);
  return holding;
}

/**
 * 从 query / body 解析持仓列表
 * 支持：
 * - holdings=1.600519,0.000001
 * - holdings=[{"code":"600519","market":1}]
 * - secids=1.600519,0.000001
 * - body.holdings 数组
 */
function pickHoldings(req) {
  const src = { ...req.query, ...(req.body || {}) };
  if (src.holdings != null) return parseHoldings(src.holdings);
  if (src.secids != null) return parseHoldings(src.secids);
  const one = pickHolding(req);
  return one ? [one] : [];
}

function createThirdPartyRouter() {
  const router = express.Router();

  // ---------- 实时报价 ----------
  // GET/POST /api/third-party/quotes?holdings=1.600519,0.000001
  // POST body: { holdings: [{ code, market }] }
  async function handleQuotes(req, res) {
    try {
      const holdings = pickHoldings(req);
      if (!holdings.length) {
        return res.status(400).json({
          code: 400,
          message: '请传入 holdings 或 secids，如 1.600519,0.000001'
        });
      }
      const data = await loadQuotes(holdings);
      res.json({ code: 200, data });
    } catch (err) {
      res.status(500).json({ code: 500, message: err.message });
    }
  }
  router.get('/quotes', handleQuotes);
  router.post('/quotes', handleQuotes);

  // ---------- 市值 ----------
  // GET /api/third-party/market-cap?code=600519&market=1
  router.get('/market-cap', async (req, res) => {
    try {
      const holding = pickHolding(req);
      if (!holding) {
        return res.status(400).json({ code: 400, message: '请传入 code' });
      }
      const data = await loadStockMarketCap(holding);
      res.json({ code: 200, data });
    } catch (err) {
      res.status(500).json({ code: 500, message: err.message });
    }
  });

  // ---------- 个股资料（市值 + 财报 + 十大股东） ----------
  // GET /api/third-party/profile?code=600519&market=1
  router.get('/profile', async (req, res) => {
    try {
      const holding = pickHolding(req);
      if (!holding) {
        return res.status(400).json({ code: 400, message: '请传入 code' });
      }
      const data = await loadStockProfile(holding);
      res.json({ code: 200, data });
    } catch (err) {
      res.status(500).json({ code: 500, message: err.message });
    }
  });

  // ---------- 当日分时 ----------
  // GET /api/third-party/intraday?code=600519&market=1
  router.get('/intraday', async (req, res) => {
    try {
      const holding = pickHolding(req);
      if (!holding) {
        return res.status(400).json({ code: 400, message: '请传入 code' });
      }
      const data = await loadIntradayTrends(holding);
      res.json({ code: 200, data });
    } catch (err) {
      res.status(500).json({ code: 500, message: err.message });
    }
  });

  // ---------- 日 K + 可选区间涨跌幅 ----------
  // GET /api/third-party/klines?code=600519&market=1&withReturns=1&range=1y
  router.get('/klines', async (req, res) => {
    try {
      const holding = pickHolding(req);
      if (!holding) {
        return res.status(400).json({ code: 400, message: '请传入 code' });
      }
      const result = await loadDailyKlines(holding);
      const withReturns =
        req.query.withReturns === '1' ||
        req.query.withReturns === 'true' ||
        req.query.withReturns === 'yes';
      const range = req.query.range
        ? String(req.query.range).toLowerCase()
        : '';

      let klines = result.klines;
      if (range && ['1m', '3m', '6m', 'ytd', '1y'].includes(range)) {
        klines = sliceKlinesForRange(result.klines, range);
      }

      const data = {
        name: result.name,
        code: result.code,
        klines
      };
      if (withReturns) {
        data.returns = calcPeriodReturns(result.klines);
        // 当日涨跌幅用分时昨收补全（失败则保持 null）
        try {
          const intraday = await loadIntradayTrends(holding);
          if (
            intraday.preClose &&
            klines.length &&
            klines[klines.length - 1].close
          ) {
            const last = klines[klines.length - 1];
            data.returns.day =
              Math.round(
                ((last.close - intraday.preClose) / intraday.preClose) * 10000
              ) / 100;
          }
        } catch (_) {
          /* day 保持 null */
        }
      }
      res.json({ code: 200, data });
    } catch (err) {
      res.status(500).json({ code: 500, message: err.message });
    }
  });

  // ---------- 解析代码（添加自选） ----------
  // GET /api/third-party/resolve?code=600519&marketType=CN
  router.get('/resolve', async (req, res) => {
    try {
      const code = req.query.code != null ? String(req.query.code) : '';
      const marketType = String(req.query.marketType || 'CN').toUpperCase();
      if (!['CN', 'US'].includes(marketType)) {
        return res.status(400).json({
          code: 400,
          message: 'marketType 仅支持 CN 或 US'
        });
      }
      const data = await resolveStock(code, marketType);
      res.json({ code: 200, data });
    } catch (err) {
      const status = /未找到|请输入|格式|应为/.test(err.message) ? 400 : 500;
      res.status(status).json({ code: status, message: err.message });
    }
  });

  // ---------- A 股行业板块 ----------
  // GET /api/third-party/cn/sectors
  router.get('/cn/sectors', async (req, res) => {
    try {
      const data = await loadCnSectorBoards();
      res.json({ code: 200, data });
    } catch (err) {
      res.status(500).json({ code: 500, message: err.message });
    }
  });

  // ---------- A 股板块成分股 ----------
  // GET /api/third-party/cn/sector-stocks?board=BK1625&limit=20&kind=gainers
  // board 也可传多个：BK1625,BK0470 或 childCodes 逗号分隔
  router.get('/cn/sector-stocks', async (req, res) => {
    try {
      const board =
        req.query.board || req.query.boards || req.query.childCodes || '';
      if (!String(board).trim()) {
        return res.status(400).json({ code: 400, message: '请传入 board' });
      }
      const limit = Number(req.query.limit) || 20;
      const kind = req.query.kind === 'losers' ? 'losers' : 'gainers';
      const data = await loadCnSectorStocks(board, limit, kind);
      res.json({ code: 200, data });
    } catch (err) {
      res.status(500).json({ code: 500, message: err.message });
    }
  });

  // ---------- A 股指数 ----------
  // GET /api/third-party/cn/indices
  router.get('/cn/indices', async (req, res) => {
    try {
      const data = await loadCnIndices();
      res.json({ code: 200, data });
    } catch (err) {
      res.status(500).json({ code: 500, message: err.message });
    }
  });

  // ---------- 美股指数 ----------
  // GET /api/third-party/us/indices
  router.get('/us/indices', async (req, res) => {
    try {
      const data = await loadUsIndices();
      res.json({ code: 200, data });
    } catch (err) {
      res.status(500).json({ code: 500, message: err.message });
    }
  });

  // ---------- 美股行业板块 ----------
  // GET /api/third-party/us/sectors
  router.get('/us/sectors', async (req, res) => {
    try {
      const data = await loadUsSectorBoards();
      res.json({ code: 200, data });
    } catch (err) {
      res.status(500).json({ code: 500, message: err.message });
    }
  });

  // ---------- 美股涨跌幅榜 ----------
  // GET /api/third-party/us/rank?kind=gainers&limit=20
  router.get('/us/rank', async (req, res) => {
    try {
      const kind = req.query.kind === 'losers' ? 'losers' : 'gainers';
      const limit = Number(req.query.limit) || 20;
      const data = await loadUsStockRank(kind, limit);
      res.json({ code: 200, data });
    } catch (err) {
      res.status(500).json({ code: 500, message: err.message });
    }
  });

  return router;
}

module.exports = createThirdPartyRouter;
