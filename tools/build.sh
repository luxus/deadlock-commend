#!/bin/sh
# Build build/deadlock-commend.vpk (install as a free addons/pakNN_dir.vpk).
set -e
cd "$(dirname "$0")/.."
MODLOCK=${MODLOCK:-/workspace/qol-extract/tools/modlock}
sh tools/assemble.sh
MODLOCK_NO_UPDATE_CHECK=1 "$MODLOCK" panorama compile build/pak -o build/deadlock-commend.vpk --addon deadlock-commend
sha256sum build/deadlock-commend.vpk
