#!/bin/sh

# File schema.prisma yang akan diedit
SCHEMA_FILE="prisma/schema.prisma"

# Periksa apakah file schema.prisma ada
if [ ! -f "$SCHEMA_FILE" ]; then
    echo "Error: File $SCHEMA_FILE tidak ditemukan."
    exit 1
fi

# Periksa apakah DATABASE_URL tersedia di lingkungan
if [ -z "$DATABASE_URL" ]; then
    echo "Error: Variabel lingkungan DATABASE_URL tidak ditemukan."
    exit 1
fi

# Ganti teks `env("DATABASE_URL")` dengan nilai dari variabel lingkungan
sed -i "s|env(\"DATABASE_URL\")|"$DATABASE_URL"|g" "$SCHEMA_FILE"
echo "Perubahan berhasil disimpan di $SCHEMA_FILE"
echo "DATABASE_URL=$DATABASE_URL" > .env
sleep 5
npx prisma generate
sleep 3
node app.js