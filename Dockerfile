# 使用官方 Node 镜像作为基础环境
FROM node:18-slim

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json (如果存在)
COPY package*.json ./

# 安装依赖
RUN npm install --production

# 复制项目所有文件到工作目录
COPY . .

# 暴露服务端口 (例如 3000)
EXPOSE 3000

# 启动命令
CMD [ "node", "server.js" ]