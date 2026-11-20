#!/bin/sh
# Print or copy the Addon Settings library into this repo.
# Usage: sh lib/addon-settings/vendor.sh print
#        sh lib/addon-settings/vendor.sh update /path/to/improved-quickbuy
set -e
cd "$(dirname "$0")"
cmd=${1:-print}
case $cmd in
print)
	cat addon_settings.js
	;;
update)
	src=${2:?usage: vendor.sh update /path/to/improved-quickbuy}
	cp -f "$src/lib/addon-settings/addon_settings.js" addon_settings.js
	cp -f "$src/lib/addon-settings/VERSION" VERSION
	;;
*)
	echo "usage: vendor.sh print|update DIR" >&2
	exit 2
	;;
esac
