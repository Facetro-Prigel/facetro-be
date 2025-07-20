FROM node:22-bookworm-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl tar git openssl xfonts-utils findutils fontconfig \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /home/app

# Copy only package.json and package-lock.json first for better cache usage
COPY package*.json ./

# Install npm packages (use --omit=dev for production only)
RUN npm install --omit=dev

# Copy the rest of the application files
COPY . .

# Create the truetype font directory if it doesn't exist, move fonts, set permissions, and update font cache in one layer
RUN mkdir -p /usr/share/fonts/truetype \
    && find /home/app/design_template -type f -name "*.ttf" -exec mv {} /usr/share/fonts/truetype/ \; \
    && chmod -R 755 /usr/share/fonts/truetype \
    && mkfontscale && mkfontdir \
    && fc-cache -fv || true

# Generate Prisma client
RUN npx prisma generate

# Set environment variables
ENV PORT=3000
ENV APP_STATE="PROD"
ENV MINIO_PORT=9000
ENV MINIO_ADDRESS=:9000
ENV MINIO_CONSOLE_ADDRESS=:39000

# Make replace_database_url.sh executable
RUN chmod +x /home/app/replace_database_url.sh

# Expose the application port
EXPOSE 3000

# Command to run your application
CMD ["sh", "-c", "/home/app/replace_database_url.sh"]