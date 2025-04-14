FROM node:22 AS builder
ARG TURSO_DATABASE_URL
ARG TURSO_AUTH_TOKEN

ENV TURSO_DATABASE_URL=${TURSO_DATABASE_URL}
ENV TURSO_AUTH_TOKEN=${TURSO_AUTH_TOKEN}

WORKDIR /app
COPY . .
RUN npm i -g turbo
RUN turbo prune web --docker

FROM node:22 AS installer
WORKDIR /app

ARG TURSO_DATABASE_URL
ARG TURSO_AUTH_TOKEN

ENV TURSO_DATABASE_URL=${TURSO_DATABASE_URL}
ENV TURSO_AUTH_TOKEN=${TURSO_AUTH_TOKEN}

COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json
RUN npm i
COPY --from=builder /app/out/full/ .

RUN cp ./apps/web/.env.development ./apps/web/.env

RUN cd apps/web && touch .env
RUN cd apps/web && echo "TURSO_DATABASE_URL=${TURSO_DATABASE_URL}" >> .env
RUN cd apps/web && echo "TURSO_AUTH_TOKEN=${TURSO_AUTH_TOKEN}" >> .env

RUN npm run build -- --filter=web

FROM node:22 AS runner

ARG TURSO_DATABASE_URL
ARG TURSO_AUTH_TOKEN

ENV TURSO_DATABASE_URL=${TURSO_DATABASE_URL}
ENV TURSO_AUTH_TOKEN=${TURSO_AUTH_TOKEN}

WORKDIR /app
COPY --from=installer /app .
CMD [ "npm", "run", "start", "-w", "web" ]