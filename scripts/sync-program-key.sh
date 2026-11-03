#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$root/target/deploy"
cp "$root/keys/doju_vault-devnet.json" "$root/target/deploy/doju_vault-keypair.json"
echo "Copied devnet program keypair to target/deploy/doju_vault-keypair.json"
echo "Program id: H1QaDVDzpWcCdHvpGyb7CND7s3NqdP3zVn6ETeAm2yuF"
