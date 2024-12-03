#!/bin/bash

# 1. Baca file prisma/schema.prisma
PRISMA_FILE="prisma/schema.prisma"

if [[ ! -f "$PRISMA_FILE" ]]; then
  echo "Error: File $PRISMA_FILE tidak ditemukan."
  exit 1
fi

# 2. Ambil nilai DATABASE_URL dari environment Docker
if [[ -z "$DATABASE_URL" ]]; then
  echo "Error: Variabel lingkungan DATABASE_URL tidak diatur."
  exit 1
fi

# 3. Ganti teks 'env("DATABASE_URL")' dengan nilai DATABASE_URL
UPDATED_SCHEMA=$(sed "s/env(\"DATABASE_URL\")/\"$DATABASE_URL\"/g" "$PRISMA_FILE")

# 4. Simpan hasil perubahan ke dalam script cmd
CMD_FILE="start-prisma.sh"

echo "#!/bin/bash" > "$CMD_FILE"
echo "echo \"$UPDATED_SCHEMA\" > $PRISMA_FILE" >> "$CMD_FILE"
echo "exec \"\$@\"" >> "$CMD_FILE"

# Berikan izin eksekusi ke script cmd
chmod +x "$CMD_FILE"

echo "Script telah dibuat: $CMD_FILE"
