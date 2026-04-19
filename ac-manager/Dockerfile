FROM oven/bun:latest AS dependencies

WORKDIR /app

COPY package.json bun.lock* ./

RUN bun install --no-save --ignore-scripts

FROM oven/bun:latest AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production

ENV DATABASE_URL="sqlserver://dummy:1433;database=dummy;user=dummy;password=dummy;"

RUN bun prisma generate

RUN bun run build

FROM oven/bun:latest AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y unzip curl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="::"
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js standalone output
COPY --from=builder --chown=bun:bun /app/public ./public
RUN mkdir .next && chown bun:bun .next
COPY --from=builder --chown=bun:bun /app/.next/standalone ./
COPY --from=builder --chown=bun:bun /app/.next/static ./.next/static

# Full node_modules — avoids guessing individual package paths
COPY --from=builder --chown=bun:bun /app/node_modules ./node_modules

# Prisma generated client (custom output path: lib/generated/prisma)
COPY --from=builder --chown=bun:bun /app/lib/generated ./lib/generated

# Files needed at startup: migrate + seed
COPY --from=builder --chown=bun:bun /app/prisma ./prisma
COPY --from=builder --chown=bun:bun /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=bun:bun /app/package.json ./package.json

COPY --chmod=755 start.sh ./start.sh

EXPOSE 3000

CMD ["./start.sh"]