#!/usr/bin/env bash
# Regenerate frontend contract artifacts from the current forge build output.
# Usage: deployment/export-artifacts.sh   (run `forge build` first)
set -euo pipefail

cd "$(dirname "$0")"

for name in SovereignDiveLog DiveLogFactory; do
    src="out/${name}.sol/${name}.json"
    dst="../src/contracts/${name}.json"
    if [[ ! -f "$src" ]]; then
        echo "missing $src — run: forge build" >&2
        exit 1
    fi
    # foundry >=1.5 ships bytecode.object already 0x-prefixed; handle both formats
    jq '{abi: .abi,
         bytecode: (if (.bytecode.object | startswith("0x")) then .bytecode.object
                    else "0x" + .bytecode.object end),
         deployedBytecode: (if (.deployedBytecode.object | startswith("0x")) then .deployedBytecode.object
                            else "0x" + .deployedBytecode.object end)}' \
        "$src" > "$dst"
    echo "wrote $dst"
done
