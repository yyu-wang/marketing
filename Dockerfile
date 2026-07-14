# =============================================================================
# Marketing Wise 后端 Dockerfile（多阶段构建）
# 对应 PRD 8.1：后端 Docker 容器化运行
# =============================================================================
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# 仅安装生产依赖，减小镜像体积
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
# 暴露服务端口
EXPOSE 3000
# 健康检查（使用 Node.js 替代 wget，消除 BusyBox 兼容性风险）
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD node -e "const h=require('http');h.get('http://localhost:3000/api/health',r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"
CMD ["node", "dist/main"]
