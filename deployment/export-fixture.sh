#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
forge script script/EmitEip712Fixture.s.sol >/dev/null
cp eip712-fixture.json ../src/fixtures/eip712-fixture.json
echo "regenerated src/fixtures/eip712-fixture.json"
