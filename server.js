const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const createHealthRouter = require('./routes/health');
const createUsersRouter = require('./routes/users');
const createFocusListRouter = require('./routes/focusList');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. 中间件配置
app.use(cors());
app.use(express.json());

// 2. SSL / CA 配置（TiDB Cloud 公网必须 TLS）
const sslConfig = {
  minVersion: 'TLSv1.2',
  rejectUnauthorized: true
};

if (process.env.DB_CA_PATH) {
  const caPath = path.resolve(process.env.DB_CA_PATH);
  if (fs.existsSync(caPath)) {
    sslConfig.ca = fs.readFileSync(caPath);
    console.log('✅ CA 证书加载成功:', caPath); // 加个成功日志方便调试
  } else {
    // 【修改点】找不到证书直接报错，不要继续连接
    throw new Error(`❌ 致命错误：找不到 CA 证书文件 ${caPath}。请检查 Dockerfile 是否 COPY 了证书，或 .env 路径是否正确。`);
  }
} else {
   // 如果没有配置 DB_CA_PATH，也建议报错，因为 TiDB Cloud 必须用 SSL
   throw new Error('❌ 致命错误：环境变量 DB_CA_PATH 未配置。TiDB Cloud 必须使用 SSL 连接。');
}

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
app.use('/api/health', createHealthRouter());
app.use('/api/users', createUsersRouter(pool));
app.use('/api/focus-list', createFocusListRouter(pool));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
