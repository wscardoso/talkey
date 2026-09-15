# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma generate needs a URL at build time; runtime uses Coolify DATABASE_URL.
ENV DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/booking?schema=public"
ENV DEMO_MODE="false"
ENV NEXT_TELEMETRY_DISABLED="1"

RUN npx prisma generate
# #region agent log
RUN node -e "const os=require('os'); console.log('[debug-ac7443]', JSON.stringify({hypothesisId:'A',location:'Dockerfile:pre-build',message:'builder memory snapshot',data:{freemem:os.freemem(),totalmem:os.totalmem(),cpus:os.cpus().length},timestamp:Date.now()}))"
# #endregion
RUN npm run build || (node -e "const os=require('os'); console.error('[debug-ac7443]', JSON.stringify({hypothesisId:'A',location:'Dockerfile:build-failed',message:'npm run build failed',data:{freemem:os.freemem(),totalmem:os.totalmem(),code:process.env.npm_config_},timestamp:Date.now()}))" && exit 1)

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV="production"
ENV NEXT_TELEMETRY_DISABLED="1"
ENV PORT="3000"
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs \
  && apk add --no-cache wget

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
