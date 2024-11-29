FROM node:22-bookworm-slim

# Install curl and tar
RUN apt-get update && apt-get install -y curl tar git && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /home/app
COPY . .

# Install npm packages
RUN npm install
ENV PORT=3000
ENV APP_STATE="PROD"
ENV MINIO_PORT=9000
ENV MINIO_ADDRESS=:9000
ENV MINIO_CONSOLE_ADDRESS=:39000
RUN chmod +x /home/app/replace_database_url.sh

EXPOSE 3000

# Command to run your application
CMD ["sh -c '/home/app/replace_database_url.sh'"]