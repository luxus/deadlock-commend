#!/bin/sh
# Negative controls: each mutant of the built script must make the stand-in suite fail.
cd "$(dirname "$0")/.."
B=build/pak/panorama/scripts/deadlock_commend.js
run() { name=$1; shift; python3 -c "
import sys; s=open('$B').read(); args=sys.argv[1:]
for a,b in zip(args[::2],args[1::2]):
    assert a in s, 'mutant anchor missing: '+a; s=s.replace(a,b,1)
open('/tmp/dc_mutant.js','w').write(s)" "$@" || { echo "BROKEN $name"; return; }
  if node test/test.js /tmp/dc_mutant.js >/tmp/dc_mutant.out 2>&1; then echo "SURVIVED $name"; else echo "killed   $name ($(grep -c FAIL /tmp/dc_mutant.out) fails)"; fi; }

run default-off "const COMMEND_DEFAULT = true;" "const COMMEND_DEFAULT = false;"
run runs-when-off "const settingsChanged = () => { if (wanted()) { guard('sync', sync); kick(); } else stop(); };" "const settingsChanged = () => { guard('sync', sync); kick(); };" "	if (!wanted()) { hideRows(); return; }
	guard('sync', sync);
	if (wanted()) kick();
	AddonSettings.pulse();" "	guard('sync', sync);
	kick();
	AddonSettings.pulse();"
run write-every-tick "	if (!ok(row)) return;
	if (s.vis[key] === !!on) return;
	s.vis[key] = !!on;
	show(row, on);" "	if (!ok(row)) return;
	row.style.visibility = on ? 'visible' : 'collapse';"
run harvest-on-tick "	inject(pg);
	const id = matchId(pg);" "	inject(pg);
	collect(pg).concat(collect(findMvp(pg)));
	const id = matchId(pg);"
run findmvp-page-only "	const p = look(pg) || look(top());" "	const p = look(pg);"
run all-misses-mvp "	const targets = collect(pg).concat(collect(findMvp(pg)));" "	const targets = collect(pg);"
run skip-return-event "	if (kind === 'mask' || kind === 'return') {" "	if (kind === 'mask') {"
run team-clicks-everyone "	if (mode === 'team') return t.team === home;" "	if (mode === 'team') return true;"
run all-clicks-local "	if (t.local) return false;" "	if (false && t.local) return false;"
run tick-every-frame "const TICK_S = 1;" "const TICK_S = 0.016;"
run hook-hudpp-button "	AddonSettings.ride(() => !!st().timer);" "	const hb = top().FindChildTraverse('HudppMenuButton'); if (ok(hb)) \$.RegisterEventHandler('Activated', hb, () => {});
	AddonSettings.ride(() => !!st().timer);"
run wrong-settings-id "	id: 'deadlock_commend', title: '#Dc_Tab', prefix: 'Dc', strings: STRINGS," "	id: 'hudpp_settings', title: '#Dc_Tab', prefix: 'Dc', strings: STRINGS,"
run no-pulse "	if (wanted()) kick();
	AddonSettings.pulse();" "	if (wanted()) kick();"
run version-string "say(VERSION + ' loaded (' + AddonSettings.language() + ')');" "say('v12-test loaded (' + AddonSettings.language() + ')');"
