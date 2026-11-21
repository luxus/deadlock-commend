// Stand-in tests for Deadlock Commend: node test/test.js build/pak/panorama/scripts/deadlock_commend.js
'use strict';
const fs = require('fs');
const S = require('./panorama.js');
const { H, C, advance, buildPostGame, storage, shown } = S;
const SRC = fs.readFileSync(process.argv[2] || __dirname + '/../build/pak/panorama/scripts/deadlock_commend.js', 'utf8');
let fails = 0, passes = 0;
const assert = (c, m) => { if (c) passes++; else { fails++; console.log('FAIL', m); } if (process.env.V) console.log(c ? 'ok  ' : 'FAIL', m); };

const byId = id => { const w = p => { for (const k of p.kids) { if (k.id === id) return k; const r = w(k); if (r) return r; } return null; }; return w(H.root); };
const click = id => { const p = byId(id); if (!p) throw new Error('missing ' + id); if (p.events.onactivate) p.events.onactivate(); };
const start = (opts = {}) => {
	for (const k in storage) delete storage[k];
	if (opts.store) storage.deadlock_commend_settings = JSON.stringify(opts.store);
	buildPostGame({ screen: opts.screen || 'SelectedScreen_MVP', match: opts.match || 'Match 1001' });
	S.load(SRC);
	advance(opts.wait === undefined ? 0.05 : opts.wait);
};
const activations = () => H.clicks.filter(c => c.ev === 'Activated' || c.ev === 'CitadelPostGameCommendPlayer').map(c => c.ev + ':' + (c.id || ''));
const gameClicks = () => H.clicks.filter(c => c.id === 'CommendPlayerButton' || c.id === 'ReturnButton' || c.id === 'HeroScenePanelMask' || c.id === 'MVPHeroScenePanelMask' || c.id === 'MVPCommendButton');

start();
assert(S.errors.length === 0, 'no errors at start: ' + S.errors.join(' | '));
assert(/const COMMEND_DEFAULT = true;/.test(SRC), 'Commend buttons on by default (one constant)');
assert(S.info.some(m => /Deadlock Commend: 1.0.0 loaded/.test(m)), 'console line 1.0.0 loaded: ' + S.info.join(' | '));

// rows injected; only the current screen (MVP) is visible
assert(!!byId('DcRow_MVP') && !!byId('DcRow_Team1') && !!byId('DcRow_Team2') && !!byId('DcRow_Scoreboard'), 'a button row on Team1, Team2, Scoreboard and MVP');
assert(!byId('DcRow_Graphs'), 'no row on Graphs');
assert(shown(byId('DcRow_MVP')) && !shown(byId('DcRow_Team1')) && !shown(byId('DcRow_Team2')) && !shown(byId('DcRow_Scoreboard')), 'only the MVP row is visible on the MVP screen');
assert(byId('DcBtn_MVP_team') && byId('DcBtn_MVP_enemy') && byId('DcBtn_MVP_all') && byId('DcBtn_MVP_return'), 'Team, Enemy, All, Return buttons');
assert(!byId('DcBtn_MVP_unmuted') && !/Unmuted/.test(SRC), 'no Unmuted button');

// switching screens shows the matching row, no extra rows
H.setScreen('Team1'); advance(1);
assert(shown(byId('DcRow_Team1')) && !shown(byId('DcRow_MVP')), 'Team 1 screen: only the Team 1 row');
H.setScreen('Graphs'); advance(1);
assert(!shown(byId('DcRow_Team1')) && !shown(byId('DcRow_MVP')) && !shown(byId('DcRow_Scoreboard')), 'Graphs: no commend row');
H.setScreen('Scoreboard'); advance(1);
assert(shown(byId('DcRow_Scoreboard')), 'Scoreboard: its row is shown');

// timer: 1 Hz, no writes and no traversals while nothing changes
S.resetCounts(); advance(5);
assert(C.classWrites === 0 && C.textWrites === 0 && C.styleWrites === 0, '5 s, nothing changes: no writes (' + JSON.stringify(C) + ')');
assert(C.finds === 0, '5 s, nothing changes: no traversals (' + C.finds + ')');
assert(C.sched >= 4 && C.sched <= 6, 'timer at 1 Hz: ' + C.sched);
assert(C.childReads < 40, '5 s, nothing changes: no full-tree walk (' + C.childReads + ')');

// Team: commend the ally, not yourself, not already-commended
H.setScreen('Team1'); advance(1);
H.clicks = [];
click('DcBtn_Team1_team');
const teamNames = gameClicks().map(c => {
	let p = c.p; while (p && !p.cls.has('Player')) p = p.parent; return p ? (p.FindChildTraverse ? [...(function*(){ let n=p.kids; for (const k of n) if (k.id==='PlayerName') yield k._text; })()][0] : '') : '';
});
// simpler: count activations on commend buttons under Team1 vs Team2
const under = (panel, ev) => H.clicks.filter(c => c.ev === ev && c.p && (function hit(x, y) { for (; y; y = y.parent) if (y === x) return true; return false; })(panel, c.p));
assert(under(H.team1, 'Activated').some(c => c.id === 'CommendPlayerButton' || c.id === 'HeroScenePanelMask'), 'Team: a teammate commend control was clicked');
assert(!under(H.team1, 'Activated').some(c => { let p = c.p; while (p && !p.cls.has('Player')) p = p.parent; return p && p.cls.has('IsLocalPlayer'); }), 'Team: the local player was not clicked');
assert(!under(H.team2, 'Activated').length, 'Team: no enemy control was clicked');
assert(byId('DcBtn_Team1_team').cls.has('DcDone'), 'the Team button dims after use');

// Enemy: the living enemy, not the already-commended one
H.clicks = [];
click('DcBtn_Team1_enemy');
const enemyRows = under(H.team2, 'Activated').map(c => { let p = c.p; while (p && !p.cls.has('Player')) p = p.parent; return p; }).filter(Boolean);
assert(enemyRows.some(p => p.kids.some(k => k.id === 'PlayerName' && k._text === 'Foe')), 'Enemy: Foe was clicked');
assert(!enemyRows.some(p => p.cls.has('CommendedPlayer')), 'Enemy: the already-commended player was skipped');
assert(!under(H.team1, 'Activated').length, 'Enemy: no teammate control was clicked');

// Return: only the return control
H.clicks = [];
click('DcBtn_Team1_return');
assert(under(H.team2, 'Activated').some(c => c.id === 'ReturnButton'), 'Return: the return control was clicked');
assert(!under(H.team2, 'Activated').some(c => c.id === 'CommendPlayerButton'), 'Return: ordinary commend buttons were not clicked');
assert(H.clicks.some(c => c.ev === 'CitadelPostGameCommendPlayer' && c.id === 'ReturnButton'), 'Return: also fires CitadelPostGameCommendPlayer');

// All: everyone commendable, then the rows hide until a new match
H.clicks = [];
click('DcBtn_Team1_all');
const allRows = gameClicks().map(c => { let p = c.p; while (p && !p.cls.has('Player')) p = p.parent; return p; }).filter(Boolean);
assert(allRows.some(p => p.kids.some(k => k.id === 'PlayerName' && k._text === 'Ally')), 'All: Ally');
assert(allRows.some(p => p.kids.some(k => k.id === 'PlayerName' && k._text === 'Foe')), 'All: Foe');
assert(!allRows.some(p => p.cls.has('IsLocalPlayer')), 'All: not the local player');
assert(!allRows.some(p => p.cls.has('CommendedPlayer')), 'All: not already commended');
assert(under(H.mvp, 'Activated').length > 0, 'All: also the MVP commend control');
advance(1);
assert(!shown(byId('DcRow_Team1')) && !shown(byId('DcRow_MVP')), 'after All: the rows are hidden');
H.setScreen('Team2'); advance(1);
assert(!shown(byId('DcRow_Team2')), 'after All, another screen still hidden');

// a new match id brings the row back
H.pg.FindChildTraverse('MatchID')._text = 'Match 1002';
advance(1);
assert(shown(byId('DcRow_Team2')), 'new Match ID: the row comes back');

// off: hidden, no timer (saved settings arrive from the store page after a short delay)
for (const k in storage) delete storage[k];
storage.deadlock_commend_settings = JSON.stringify({ t: 1, commend: false });
buildPostGame({ screen: 'SelectedScreen_MVP' }); S.load(SRC); advance(2);
assert(!byId('DcRow_MVP') || !shown(byId('DcRow_MVP')), 'toggle off: no visible row');
S.resetCounts();
advance(3);
assert(!H.root.Dc || !H.root.Dc.timer, 'toggle off: our commend timer is not running');

// live toggle in the CompLock tab
for (const k in storage) delete storage[k];
buildPostGame({ screen: 'SelectedScreen_Team1' }); S.load(SRC); advance(2);
H.menuButton.events.onactivate(); advance(1.1);
assert(!!byId('DcTab'), 'Commend tab in the CompLock menu');
click('DcTab'); advance(0.1);
const titles = [];
const walk = p => p.kids.forEach(k => { if (k._text) titles.push(k._text); walk(k); });
walk(H.menu);
assert(titles.some(t => t === 'Commend buttons'), 'setting row "Commend buttons": ' + titles.filter(t => /Commend/.test(t)).join(','));
const toggle = byId('DcRow_commend');
assert(!!toggle, 'settings toggle row #DcRow_commend');
assert(shown(byId('DcRow_Team1')), 'rows visible before switching the toggle off');
toggle.events.onactivate(); advance(1);
assert(!shown(byId('DcRow_Team1')) && !shown(byId('DcRow_MVP')), 'toggle off live: rows hidden');

// no handlers registered on HUD++ panels
assert(S.handlers.filter(h => h.p).every(h => !/^Hudpp/.test(String(h.p.id))), 'event handlers not registered on HUD++ panels: ' + S.handlers.filter(h => h.p && /^Hudpp/.test(String(h.p.id))).map(h => h.p.id).join(','));

// CSS: no world-blur
const css = fs.readFileSync(__dirname + '/../src/deadlock_commend.css', 'utf8');
assert(!/world-blur/.test(css) && !/world-blur/.test(SRC.replace(/\/\/.*$/gm, '')), 'no world-blur');

// every language ships the button words
const table = name => { const m = new RegExp('const ' + name + ' = \\{').exec(SRC); const i = m.index + m[0].length - 1; let d = 0, j = i; for (; j < SRC.length; j++) { if (SRC[j] === '{') d++; else if (SRC[j] === '}' && --d === 0) break; } return (0, eval)('(' + SRC.slice(i, j + 1) + ')'); };
const STR = table('STRINGS');
Object.keys(STR).forEach(l => {
	['Dc_Commend', 'Dc_Commend_Desc', 'Dc_Team', 'Dc_Enemy', 'Dc_All', 'Dc_Return'].forEach(k => assert(typeof STR[l][k] === 'string' && STR[l][k], l + ' ' + k));
	assert(!/ß/.test(STR[l].Dc_Commend_Desc + STR[l].Dc_Return), l + ': no ß');
});

assert(S.errors.length === 0, 'no errors at end: ' + S.errors.join(' | '));
console.log(`${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
