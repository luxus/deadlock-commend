#!/bin/sh
# Assemble build/pak from src/ and vanilla/. No modlock needed: CI and tests use this.
set -e
cd "$(dirname "$0")/.."
rm -rf build/pak && mkdir -p build/pak/panorama/scripts build/pak/panorama/styles \
	build/pak/panorama/layout/post_game
{
	echo '// Deadlock Commend v1-test - built from src/ by tools/build.sh. Written from scratch; no third-party commend-mod code included.'
	echo '(() => {'
	echo "'use strict';"
	sh lib/addon-settings/vendor.sh print
	cat src/strings.js src/main.js
	echo '})();'
} > build/pak/panorama/scripts/deadlock_commend.js
cp src/deadlock_commend.css build/pak/panorama/styles/deadlock_commend.css
node tools/loc.js src/strings.js STRINGS build/pak deadlock_commend >/dev/null
python3 tools/layout.py vanilla/citadel_db_page_post_game_new.xml \
	build/pak/panorama/layout/post_game/citadel_db_page_post_game_new.xml
python3 tools/layout.py vanilla/citadel_db_post_game_progress_mvp.xml \
	build/pak/panorama/layout/post_game/citadel_db_post_game_progress_mvp.xml
node --check build/pak/panorama/scripts/deadlock_commend.js
