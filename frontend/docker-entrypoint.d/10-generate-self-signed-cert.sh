#!/bin/sh
set -eu

CERT_DIR="/etc/nginx/certs"
CERT_FILE="$CERT_DIR/server.crt"
KEY_FILE="$CERT_DIR/server.key"
CA_CERT_FILE="$CERT_DIR/ca.crt"
CA_KEY_FILE="$CERT_DIR/ca.key"
CERT_CN="${TLS_CERT_COMMON_NAME:-security-room-system.local}"
CERT_SAN="${TLS_CERT_SUBJECT_ALT_NAME:-DNS:localhost,DNS:security-room-system.local,IP:127.0.0.1}"

mkdir -p "$CERT_DIR"

if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
  exit 0
fi

if [ ! -f "$CA_CERT_FILE" ] || [ ! -f "$CA_KEY_FILE" ]; then
  openssl req -x509 -nodes -newkey rsa:4096 -days 3650 \
    -keyout "$CA_KEY_FILE" \
    -out "$CA_CERT_FILE" \
    -subj "/CN=Security Room Local CA"
fi

openssl req -nodes -newkey rsa:2048 \
  -keyout "$KEY_FILE" \
  -out "$CERT_DIR/server.csr" \
  -subj "/CN=$CERT_CN"

cat > "$CERT_DIR/server.ext" <<EOF
subjectAltName=$CERT_SAN
extendedKeyUsage=serverAuth
EOF

openssl x509 -req -days 825 \
  -in "$CERT_DIR/server.csr" \
  -CA "$CA_CERT_FILE" \
  -CAkey "$CA_KEY_FILE" \
  -CAcreateserial \
  -out "$CERT_FILE" \
  -extfile "$CERT_DIR/server.ext"

chmod 600 "$KEY_FILE"
chmod 600 "$CA_KEY_FILE"
