// Deadlock Commend: buttons on the post-game screens to commend your team, the enemy, everyone, or
// to return commends. Options are registered with Addon Settings (lib/addon-settings, vendored in
// front of this file): a "Commend" tab in CompLock HUD++'s menu, or the ADDONS window without HUD++.
//
// Cost model: the script is loaded only with the post-game layouts. One timer at 1 Hz while the
// buttons can be shown, none when the toggle is off. The post-game root and screen panels are
// found once and kept. Visibility and dimming are written only on change. Game commend controls
// are walked only when a button is pressed, never on the timer. HUD++'s panels get no handlers.

const VERSION = 'v1-test';
const ok = p => !!(p && p.IsValid && p.IsValid());
const cancel = h => { if (h) { try { $.CancelScheduled(h); } catch (e) { /* already ran */ } } return null; };
const say = e => { try { $.Msg('Deadlock Commend: ' + e); } catch (x) { /* no console */ } };
const guard = (what, f) => { try { return f(); } catch (e) { say(what + ': ' + e); return undefined; } };
const show = (p, on) => { const v = on ? 'visible' : 'collapse'; if (ok(p) && p.style.visibility !== v) p.style.visibility = v; };
const make = (type, parent, id, cls) => {
	const p = $.CreatePanel(type, parent, id || '');
	if (cls) cls.split(' ').forEach(c => { if (c) p.AddClass(c); });
	return p;
};

const ctx = $.GetContextPanel();
const top = () => { let p = ctx; while (ok(p) && ok(p.GetParent())) p = p.GetParent(); return p; };
const typ = p => { try { return p.paneltype || p.type || ''; } catch (e) { return ''; } };

// TEST BUILD: on, so it can be tried at once; set to false before a release.
const COMMEND_DEFAULT = true;
const DEFAULTS = { commend: COMMEND_DEFAULT };
const cfg = Object.assign({}, DEFAULTS);

const TICK_S = 1;
const SCREENS = ['Team1', 'Team2', 'Scoreboard', 'MVP'];
const SCREEN_IDS = { Team1: 'Team1Screen', Team2: 'Team2Screen', Scoreboard: 'ScoreboardScreen', MVP: 'MVPScreen' };
const MODES = [
	{ mode: 'team', token: 'Dc_Team', cls: 'DcTeam' },
	{ mode: 'enemy', token: 'Dc_Enemy', cls: 'DcEnemy' },
	{ mode: 'all', token: 'Dc_All', cls: 'DcAll' },
	{ mode: 'return', token: 'Dc_Return', cls: 'DcReturn' }
];
const LOCAL_CLASSES = ['IsLocalPlayer', 'LocalPlayer', 'local_player', 'IsLocal'];
const DONE_CLASSES = ['CommendedPlayer', 'AlreadyCommended', 'CommendReturned', 'CantCommend', 'MVPCantCommend', 'MVPAlreadyCommended'];

// Shared across the two layout includes (page and MVP) so only one timer runs.
const st = () => {
	const r = top();
	if (!r.Dc) r.Dc = { timer: null, match: '', done: false, vis: {}, rows: {}, pg: null, matchLabel: null, screens: {} };
	return r.Dc;
};

const wanted = () => !!cfg.commend;

const isOurs = p => {
	if (!p) return true;
	const id = p.id || '';
	return id.indexOf('Dc') === 0 || (p.BHasClass && (p.BHasClass('DcRow') || p.BHasClass('DcBtn') || p.BHasClass('DcBtnLabel') || p.BHasClass('DcBtnIcon')));
};

const climbHas = (p, names) => {
	for (let q = p, n = 0; ok(q) && n < 40; q = q.GetParent(), n++) {
		for (let i = 0; i < names.length; i++) {
			const name = names[i];
			if ((q.id || '') === name) return q;
			if (q.BHasClass && q.BHasClass(name)) return q;
		}
	}
	return null;
};

const findPostGame = () => {
	const s = st();
	if (ok(s.pg)) return s.pg;
	for (let p = ctx, n = 0; ok(p) && n < 40; p = p.GetParent(), n++) {
		if ((p.id || '') === 'CitadelPostGameNew' || typ(p) === 'CitadelPostGameNew') { s.pg = p; return p; }
	}
	return null;
};

const findMvp = pg => {
	const s = st();
	if (ok(s.screens.MVP)) return s.screens.MVP;
	const look = start => {
		if (!ok(start)) return null;
		if (typ(start) === 'CitadelPostGameProgressMVP') return start;
		if (!start.FindChildTraverse) return null;
		const named = start.FindChildTraverse('MVPScreen');
		if (ok(named)) return named;
		const spot = start.FindChildTraverse('MVPHeroSpotlight');
		if (!ok(spot)) return null;
		for (let p = spot, n = 0; ok(p) && n < 30; p = p.GetParent(), n++) {
			if ((p.id || '') === 'MVPScreen' || typ(p) === 'CitadelPostGameProgressMVP') return p;
		}
		return null;
	};
	const p = look(pg) || look(top());
	if (ok(p)) s.screens.MVP = p;
	return ok(p) ? p : null;
};

const screenPanel = (pg, key) => {
	const s = st();
	if (ok(s.screens[key])) return s.screens[key];
	if (key === 'MVP') return findMvp(pg);
	if (!ok(pg) || !pg.FindChildTraverse) return null;
	const p = pg.FindChildTraverse(SCREEN_IDS[key]);
	if (ok(p)) s.screens[key] = p;
	return ok(p) ? p : null;
};

const currentScreen = pg => {
	if (!ok(pg)) return typ(ctx) === 'CitadelPostGameProgressMVP' ? 'MVP' : '';
	if (pg.BHasClass('SelectedScreen_MVP')) return 'MVP';
	if (pg.BHasClass('SelectedScreen_Team1')) return 'Team1';
	if (pg.BHasClass('SelectedScreen_Team2')) return 'Team2';
	if (pg.BHasClass('SelectedScreen_Scoreboard')) return 'Scoreboard';
	if (pg.BHasClass('SelectedScreen_Graphs')) return 'Graphs';
	if (typ(ctx) === 'CitadelPostGameProgressMVP') return 'MVP';
	return '';
};

const canCommend = pg => {
	if (ok(pg) && pg.BHasClass('CanCommendPlayers')) return true;
	const s = st();
	for (let i = 0; i < SCREENS.length; i++) {
		const p = ok(s.screens[SCREENS[i]]) ? s.screens[SCREENS[i]] : null;
		if (ok(p) && p.BHasClass('CanCommendPlayers')) return true;
	}
	return false;
};

const matchId = pg => {
	const s = st();
	if (!ok(s.matchLabel) && ok(pg) && pg.FindChildTraverse) s.matchLabel = pg.FindChildTraverse('MatchID');
	if (!ok(s.matchLabel)) return '';
	try { return s.matchLabel.text || ''; } catch (e) { return ''; }
};

const word = token => AddonSettings.localize('#' + token, STRINGS);

const injectRow = (parent, key) => {
	const s = st();
	if (ok(s.rows[key])) return s.rows[key];
	if (!ok(parent)) return null;
	const row = make('Panel', parent, 'DcRow_' + key, 'DcRow');
	row.hittest = true;
	MODES.forEach(m => {
		const btn = make('Button', row, 'DcBtn_' + key + '_' + m.mode, 'DcBtn ' + m.cls);
		make('Panel', btn, '', 'DcBtnIcon');
		const lab = make('Label', btn, '', 'DcBtnLabel');
		lab.hittest = false;
		lab.text = word(m.token);
		btn.SetPanelEvent('onactivate', () => guard('commend ' + m.mode, () => onCommend(m.mode, btn)));
	});
	s.rows[key] = row;
	s.vis[key] = null;
	return row;
};

const inject = pg => {
	SCREENS.forEach(key => injectRow(screenPanel(pg, key), key));
};

const setRowVisible = (key, on) => {
	const s = st();
	const row = s.rows[key];
	if (!ok(row)) return;
	if (s.vis[key] === !!on) return;
	s.vis[key] = !!on;
	show(row, on);
};

const hideRows = () => SCREENS.forEach(key => setRowVisible(key, false));

const resetMatch = () => {
	const s = st();
	s.done = false;
	SCREENS.forEach(key => {
		const row = s.rows[key];
		if (!ok(row) || !row.GetChildCount) return;
		for (let i = 0; i < row.GetChildCount(); i++) {
			const b = row.GetChild(i);
			if (ok(b) && b.BHasClass('DcDone')) b.RemoveClass('DcDone');
		}
	});
};

const sync = () => {
	const s = st();
	if (!wanted()) { hideRows(); return; }
	const pg = findPostGame();
	if (!ok(pg) && typ(ctx) !== 'CitadelPostGameProgressMVP') { hideRows(); return; }
	inject(pg);
	const id = matchId(pg);
	if (id && id !== s.match) { s.match = id; resetMatch(); }
	if (s.done) { hideRows(); return; }
	const screen = currentScreen(pg);
	const allow = canCommend(pg);
	SCREENS.forEach(key => setRowVisible(key, allow && screen === key));
};

const teamOf = p => {
	for (let q = p, n = 0; ok(q) && n < 40; q = q.GetParent(), n++) {
		const id = q.id || '';
		if (id === 'Team1' || id === 'Team1Screen' || id === 'Team1Players') return 'Team1';
		if (id === 'Team2' || id === 'Team2Screen' || id === 'Team2Players') return 'Team2';
		if (q.BHasClass && q.BHasClass('Team1')) return 'Team1';
		if (q.BHasClass && q.BHasClass('Team2')) return 'Team2';
	}
	return '';
};

const kindOf = p => {
	const id = p.id || '';
	if (id === 'ReturnButton' || (p.BHasClass && p.BHasClass('CanReturnCommend'))) return 'return';
	if (id === 'CommendPlayerButton' || id === 'MVPCommendButton' || (p.BHasClass && p.BHasClass('CommendButton'))) return 'button';
	if (id === 'HeroScenePanelMask' || id === 'MVPHeroScenePanelMask') return 'mask';
	return '';
};

const playerName = host => {
	if (!ok(host) || !host.FindChildTraverse) return '';
	const n = host.FindChildTraverse('PlayerName') || host.FindChildTraverse('MVPPlayerName');
	try { return n && n.text ? String(n.text).replace(/^\s+|\s+$/g, '').toLowerCase() : ''; } catch (e) { return ''; }
};

const collect = root => {
	const out = [];
	const walk = p => {
		if (!ok(p) || isOurs(p)) return;
		const kind = kindOf(p);
		if (kind) out.push({ btn: p, kind: kind, team: teamOf(p), local: !!climbHas(p, LOCAL_CLASSES), done: !!climbHas(p, DONE_CLASSES), name: playerName(climbHas(p, ['Player', 'MVPDetails', 'MVPHonorableMention']) || p) });
		if (!p.GetChildCount) return;
		for (let i = 0, n = p.GetChildCount(); i < n; i++) walk(p.GetChild(i));
	};
	walk(root);
	return out;
};

const localTeam = (root, targets) => {
	for (let i = 0; i < targets.length; i++) if (targets[i].local && targets[i].team) return targets[i].team;
	const classes = LOCAL_CLASSES;
	for (let i = 0; i < classes.length; i++) {
		if (!root.FindChildrenWithClassTraverse) continue;
		const found = root.FindChildrenWithClassTraverse(classes[i]) || [];
		if (found.length) {
			const t = teamOf(found[0]);
			if (t) return t;
		}
	}
	return '';
};

const matchesMode = (t, mode, home) => {
	if (!t || !t.btn) return false;
	if (t.local) return false;
	if (mode === 'return') return t.kind === 'return' && !t.done;
	if (t.done || t.kind === 'return') return false;
	if (mode === 'all') return t.kind === 'button' || t.kind === 'mask';
	if (!t.team || !home) return false;
	if (mode === 'team') return t.team === home;
	if (mode === 'enemy') return t.team !== home;
	return false;
};

const clickPanel = (btn, kind) => {
	try { $.DispatchEvent('Activated', btn, 'mouse'); } catch (e) {}
	try { $.DispatchEvent('MouseActivate', btn, 'mouse'); } catch (e2) {}
	if (kind === 'mask' || kind === 'return') {
		try { $.DispatchEvent('CitadelPostGameCommendPlayer', btn); } catch (e3) {}
	}
};

const onCommend = (mode, src) => {
	if (!wanted()) return;
	const pg = findPostGame();
	if (!canCommend(pg) && mode !== 'return') return;
	const targets = collect(pg).concat(collect(findMvp(pg)));
	const home = localTeam(pg || top(), targets);
	const seen = {};
	const rank = k => k === 'button' ? 0 : k === 'mask' ? 1 : 2;
	targets.sort((a, b) => rank(a.kind) - rank(b.kind));
	for (let i = 0; i < targets.length; i++) {
		const t = targets[i];
		if (!ok(t.btn) || isOurs(t.btn)) continue;
		if (!matchesMode(t, mode, home)) continue;
		if (mode !== 'return' && t.name && seen[t.name]) continue;
		if (t.name) seen[t.name] = true;
		clickPanel(t.btn, t.kind);
	}
	if (ok(src)) src.AddClass('DcDone');
	if (mode === 'all') { st().done = true; hideRows(); }
};

let ticking = false;
const tick = () => {
	ticking = false;
	const s = st();
	s.timer = null;
	if (!wanted()) { hideRows(); return; }
	guard('sync', sync);
	if (wanted()) kick();
	AddonSettings.pulse();
};

const kick = () => {
	const s = st();
	if (s.timer || ticking) return;
	ticking = true;
	s.timer = $.Schedule(TICK_S, tick);
};

const stop = () => {
	const s = st();
	s.timer = cancel(s.timer);
	ticking = false;
	hideRows();
};

const SCHEMA = {
	id: 'deadlock_commend', title: '#Dc_Tab', prefix: 'Dc', strings: STRINGS,
	controls: [
		{ key: 'commend', type: 'toggle', section: '#Dc_Section', title: '#Dc_Commend', desc: '#Dc_Commend_Desc', default: DEFAULTS.commend }
	]
};

const settingsChanged = () => { if (wanted()) { guard('sync', sync); kick(); } else stop(); };

say(VERSION + ' loaded (' + AddonSettings.language() + ')');
guard('start', () => {
	AddonSettings.ride(() => !!st().timer);
	AddonSettings.register(SCHEMA, values => { Object.assign(cfg, values); settingsChanged(); });
	if (wanted()) { guard('sync', sync); kick(); }
});
