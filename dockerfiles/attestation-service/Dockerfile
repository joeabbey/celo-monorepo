FROM circleci/node:10
WORKDIR /celo-monorepo

RUN sudo apt-get update -y
RUN sudo apt-get install lsb-release libudev-dev libusb-dev libusb-1.0-0 -y

# ensure yarn.lock is evaluated by kaniko cache diff
COPY lerna.json package.json yarn.lock ./
COPY scripts/ scripts/

# Copy only pkg.json
COPY packages/typescript/package.json packages/typescript/
COPY packages/utils/package.json packages/utils/
COPY packages/dev-utils/package.json packages/dev-utils/
COPY packages/protocol/package.json packages/protocol/
COPY packages/contractkit/package.json packages/contractkit/
COPY packages/attestation-service/package.json packages/attestation-service/

RUN sudo yarn install --frozen-lockfile --network-timeout 100000 && yarn cache clean

# Copy the rest
COPY packages/typescript packages/typescript/
COPY packages/utils packages/utils/
COPY packages/dev-utils packages/dev-utils/
COPY packages/protocol packages/protocol/
COPY packages/contractkit packages/contractkit/
COPY packages/attestation-service packages/attestation-service/

ENV NODE_ENV production

# build all
RUN sudo yarn build

WORKDIR /celo-monorepo/packages/attestation-service
ENTRYPOINT ["node", "lib/index.js"]
