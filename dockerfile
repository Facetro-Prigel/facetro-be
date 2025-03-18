FROM node:22-bookworm-slim

# Install dependencies
RUN apt-get update && apt-get install -y curl tar git openssl xfonts-utils findutils fontconfig && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /home/app

# Copy all files from the current directory to the container
COPY . .

# Create the truetype font directory if it doesn't exist
RUN mkdir -p /usr/share/fonts/truetype

# Verify that .ttf files exist in the source directory
RUN ls -l /home/app/design_template || true

# Recursively find and move all .ttf files from design_template and its subdirectories
RUN find /home/app/design_template -type f -name "*.ttf" -exec mv {} /usr/share/fonts/truetype/ \;

# List fonts to verify installation (ignore error if directory is empty)
RUN ls /usr/share/fonts/truetype || true

# Set permissions for font files
RUN chmod -R 755 /usr/share/fonts/truetype

# Generate font scale and directory files
RUN mkfontscale && mkfontdir && \
    ls -l /usr/share/fonts/truetype

# Optionally, rebuild font cache
RUN fc-cache -fv

# Install npm packages
RUN npm install

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