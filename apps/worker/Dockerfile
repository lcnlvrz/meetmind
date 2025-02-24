FROM public.ecr.aws/lambda/nodejs:22 AS builder
WORKDIR /app
COPY . .
RUN npm i -g turbo
RUN turbo prune worker --docker

FROM public.ecr.aws/lambda/nodejs:22 AS installer
WORKDIR /app
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json
RUN npm i
COPY --from=builder /app/out/full/ .
RUN npm run build -- --filter=worker

FROM public.ecr.aws/lambda/nodejs:22 AS runner
COPY --from=installer /app/apps/worker/dist/index.js ${LAMBDA_TASK_ROOT}
RUN dnf install wget tar xz -y
RUN wget https://johnvansickle.com/ffmpeg/builds/ffmpeg-git-amd64-static.tar.xz
RUN tar -xvf ffmpeg-git-amd64-static.tar.xz
RUN cp ffmpeg-git-20240629-amd64-static/ffmpeg /usr/local/bin/ffmpeg
RUN chmod +x /usr/local/bin/ffmpeg
CMD [ "index.handler" ]