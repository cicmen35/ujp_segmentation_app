#!/usr/bin/env bash
set -eu

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <host-or-ip> <output-dir>"
  exit 1
fi

HOST_NAME="$1"
OUTPUT_DIR="$2"
KEY_FILE="${OUTPUT_DIR}/segment-web-app.key"
CERT_FILE="${OUTPUT_DIR}/segment-web-app.crt"
CONFIG_FILE="${OUTPUT_DIR}/openssl-san.cnf"

mkdir -p "${OUTPUT_DIR}"

if [[ "${HOST_NAME}" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
  ALT_NAME_LINE="IP.1 = ${HOST_NAME}"
else
  ALT_NAME_LINE="DNS.1 = ${HOST_NAME}"
fi

cat > "${CONFIG_FILE}" <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
x509_extensions = v3_req
distinguished_name = dn

[dn]
CN = ${HOST_NAME}

[v3_req]
subjectAltName = @alt_names

[alt_names]
${ALT_NAME_LINE}
EOF

openssl req \
  -x509 \
  -nodes \
  -days 365 \
  -newkey rsa:2048 \
  -keyout "${KEY_FILE}" \
  -out "${CERT_FILE}" \
  -config "${CONFIG_FILE}"

echo "Created:"
echo "  ${CERT_FILE}"
echo "  ${KEY_FILE}"
