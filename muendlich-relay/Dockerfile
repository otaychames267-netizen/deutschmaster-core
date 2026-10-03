FROM node:22-slim AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
# Real gap found via a professional-experience audit (2026-10-03): the
# pre-generated audio library (phraseLibrary/generateLibrary.ts) was never
# copied into the deployed image — generating it locally would have had
# ZERO effect on the live relay, since playLibraryPhrase() looks for these
# files relative to the running process's own filesystem. Raw PCM16@24kHz
# is large (no compression, by design — zero runtime transcoding cost), so
# this does meaningfully grow the image; accepted as the simplest correct
# option over a separate Fly volume or remote-storage fetch, given this is
# a one-time asset set, not something regenerated per deploy.
COPY audio-library ./audio-library
EXPOSE 8787
CMD ["node", "dist/server.js"]
