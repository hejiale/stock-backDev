const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const createUsersRouter = require('./routes/users');
const createFocusListRouter = require('./routes/focusList');
const createThirdPartyRouter = require('./routes/thirdParty');
const createStockRouter = require('./routes/stock');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. 中间件配置
app.use(cors());
app.use(express.json());

// 2. SSL / CA 配置（TiDB Cloud 公网必须 TLS）
// 优先从环境变量读取证书内容（Railway 推荐），本地开发则读文件
let caCert;

if (process.env.DB_CA_CONTENT) {
  caCert = process.env.DB_CA_CONTENT.replace(/\\n/g, '\n');
  console.log('✅ CA 证书从环境变量 DB_CA_CONTENT 加载成功');
} else {
  const certPath = path.join(__dirname, 'certs', 'isrgrootx1.pem');
  try {
    caCert = fs.readFileSync(certPath, 'utf8');
    console.log('✅ CA 证书加载成功:', certPath);
  } catch (err) {
    console.error('找不到证书文件，且未配置 DB_CA_CONTENT 环境变量');
  }
}

const sslConfig = caCert
  ? {
      ca: caCert,
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true
    }
  : undefined; // 无证书时不传 ssl（仅限本地测试，线上必须配置）

// 3. 创建 TiDB 数据库连接池
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 4000,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: sslConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 15000
});

// 验证连接是否成功
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ TiDB 数据库连接成功！');
    connection.release();
  } catch (err) {
    console.error('数据库连接失败:', err.message);
    if (err.code) console.error('错误码:', err.code);
  }
})();

// ================== API 接口路由 ==================
app.use('/api/users', createUsersRouter(pool));
app.use('/api/focus-list', createFocusListRouter(pool));
app.use('/api/third-party', createThirdPartyRouter());
app.use('/api/stock', createStockRouter(pool));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
