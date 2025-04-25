# Use the Node official image
# https://hub.docker.com/_/node
FROM node:20

# Create and change to the app directory.
# WORKDIR /app

# Copy local code to the container image
COPY . ./

# Install packages
RUN yarn 

# Serve the app
RUN yarn run build

CMD ["yarn", "run", "dev"]