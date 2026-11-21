// Panorama stand-in for Deadlock Commend: panels, a virtual clock, a post-game tree, HUD++'s menu.
// Counts every call that costs something. Not the game: numbers from here are stand-in numbers.
'use strict';

const C = { sched: 0, finds: 0, nodes: 0, childReads: 0, reads: 0, classWrites: 0, classChanges: 0, textWrites: 0, textChanges: 0, images: 0, styleWrites: 0, created: 0, dispatches: 0 };
const resetCounts = () => Object.keys(C).forEach(k => { C[k] = 0; });

let now = 0, seq = 0, jobs = [], handlers = [], errors = [], info = [];
const INFO = /^(Deadlock Commend: v?\d[\w +.-]* loaded|Addon Settings: (build \d+ hosts|no Esc menu ))/;
const storage = {};
const net = { online: true, writes: [] };

class P {
	constructor(type, parent, id) {
		this.type = type; this.paneltype = type; this.id = id || ''; this.cls = new Set(); this.kids = []; this.attrs = {}; this.parent = null; this.valid = true; this.events = {}; this._text = ''; this.applied = {}; this.hittest = true; this.enabled = true;
		const self = this;
		this.style = new Proxy({}, { set(o, k, v) { C.styleWrites++; o[k] = v; if (v !== null && v !== undefined) self.applied[k] = v; return true; } });
		if (parent) { parent.kids.push(this); this.parent = parent; }
	}
	get text() { C.reads++; return this._text; }
	set text(v) { C.textWrites++; if (this._text !== v) C.textChanges++; this._text = v; }
	IsValid() { C.reads++; return this.valid; }
	GetParent() { return this.parent; }
	AddClass(c) { this.SetHasClass(c, true); }
	RemoveClass(c) { this.SetHasClass(c, false); }
	SetHasClass(c, on) { C.classWrites++; if (this.cls.has(c) === !!on) return; C.classChanges++; on ? this.cls.add(c) : this.cls.delete(c); }
	BHasClass(c) { C.reads++; return this.cls.has(c); }
	SetPanelEvent(e, f) { this.events[e] = f; }
	SetAttributeString(k, v) { this.attrs[k] = v; }
	GetAttributeString(k, d) { return k in this.attrs ? this.attrs[k] : d; }
	FindChild(id) { C.childReads++; return this.kids.find(k => k.id === id) || null; }
	FindChildTraverse(id) { C.finds++; const walk = p => { for (const k of p.kids) { C.nodes++; if (k.id === id) return k; const r = walk(k); if (r) return r; } return null; }; return walk(this); }
	FindChildrenWithClassTraverse(c) { C.finds++; const out = []; const walk = p => p.kids.forEach(k => { C.nodes++; if (k.cls.has(c)) out.push(k); walk(k); }); walk(this); return out; }
	GetChildCount() { C.childReads++; return this.kids.length; }
	GetChild(i) { C.childReads++; return this.kids[i] || null; }
	MoveChildBefore(c, b) { this.kids.splice(this.kids.indexOf(c), 1); this.kids.splice(this.kids.indexOf(b), 0, c); }
	DeleteAsync() { this.valid = false; if (this.parent) this.parent.kids.splice(this.parent.kids.indexOf(this), 1); }
	Activate() { $.DispatchEvent('Activated', this); }
	SetURL(url) {
		const title = t => $.Schedule(0.05, () => handlers.filter(h => h.p === this && h.ev === 'HTMLTitle').forEach(h => h.f(this, t)));
		const hash = url.split('#')[1];
		if (!net.online) return;
		if (!hash) { title('HUDPP_READY:1'); return; }
		const m = JSON.parse(decodeURIComponent(hash)); const r = { id: m.id };
		if (m.op === 'get') r.value = m.key in storage ? storage[m.key] : null;
		else if (m.op === 'set') { storage[m.key] = String(m.value); r.value = String(m.value); net.writes.push(m.key); }
		title('HUDPP:' + JSON.stringify(r));
	}
}

global.$ = {
	GetContextPanel: () => H.ctx,
	CreatePanel: (t, parent, id) => { C.created++; const x = new P(t, parent, id); if (t === 'Slider') { new P('Panel', x, 'SliderTrack'); new P('Button', x, 'SliderThumb'); let v = 0; Object.defineProperty(x, 'value', { get: () => v, set: n => { v = Math.max(0, Math.min(1, Number(n))); handlers.filter(h => h.p === x && h.ev === 'SliderValueChanged').forEach(h => h.f(x)); } }); } return x; },
	Schedule: (t, f) => { C.sched++; const j = { due: now + Math.max(0, t), f, id: ++seq }; jobs.push(j); return j.id; },
	CancelScheduled: id => { jobs = jobs.filter(j => j.id !== id); },
	DispatchEvent(ev, p) {
		C.dispatches++;
		H.clicks.push({ ev: ev, id: p && p.id, p: p });
		if (ev === 'Activated' && p && p.valid && p.events.onactivate) p.events.onactivate();
	},
	Localize: s => s, Msg: m => { (INFO.test(m) ? info : errors).push('msg: ' + m); },
	RegisterForUnhandledEvent: (ev, f) => handlers.push({ ev, p: null, f }),
	RegisterEventHandler: (ev, p, f) => { const id = ++seq; handlers.push({ ev, p, f, id }); return id; },
	UnregisterEventHandler: (ev, p, id) => { handlers = handlers.filter(h => h.id !== id); },
};

const advance = secs => {
	const end = now + secs;
	for (;;) {
		jobs.sort((a, b) => a.due - b.due || a.id - b.id);
		const j = jobs[0];
		if (!j || j.due > end) break;
		jobs.shift(); now = j.due;
		try { j.f(); } catch (e) { errors.push(String(e && e.stack || e).slice(0, 300)); }
	}
	now = end;
};

const mk = (t, parent, id, cls, text) => { const x = new P(t, parent, id); (cls || '').split(' ').filter(Boolean).forEach(c => x.cls.add(c)); if (text !== undefined) x._text = text; return x; };
const filler = (parent, n, tag) => { for (let i = 0; i < n; i++) { const a = mk('Panel', parent, tag + i); mk('Label', a, ''); } };

const player = (parent, opts) => {
	const cls = ['Player'].concat(opts.cls || []).join(' ');
	const row = mk('Panel', parent, opts.id || '', cls);
	if (opts.local) row.cls.add('IsLocalPlayer');
	if (opts.done) row.cls.add('CommendedPlayer');
	mk('Label', row, opts.mvp ? 'MVPPlayerName' : 'PlayerName', 'PlayerName', opts.name);
	if (opts.ret) {
		const b = mk('Button', row, 'ReturnButton', 'CanReturnCommend');
		if (opts.returned) { row.cls.add('CommendReturned'); b.cls.add('CommendReturned'); }
	} else {
		mk('Button', row, 'CommendPlayerButton', 'CommendButton');
		if (opts.mask) mk('Panel', row, opts.mvp ? 'MVPHeroScenePanelMask' : 'HeroScenePanelMask');
	}
	return row;
};

const H = {};
const buildPostGame = (opts = {}) => {
	jobs = []; handlers = []; errors = []; info = []; H.clicks = [];
	const root = H.root = mk('Panel', null, 'DashboardRoot');
	filler(root, 40, 'Chrome');
	const esc = H.esc = mk('Panel', root, 'EscapeMenu');
	const sub = mk('Panel', mk('Panel', mk('Panel', esc, 'LeftStripe'), 'Menu'), 'SubOptions');
	H.menuButton = mk('Button', mk('Panel', sub, '', 'HudppMenuRow'), 'HudppMenuButton', 'nav_menu_item minor');
	H.menuButton.events.onactivate = () => press(H.menuButton, () => (H.menu && H.menu.BHasClass('HudppOpen')) ? H.closeMenu() : H.openMenu());
	H.menu = null; H.tab = 'hud';
	const pg = H.pg = mk('CitadelPostGameNew', root, 'CitadelPostGameNew', 'DashboardPage CanCommendPlayers ' + (opts.screen || 'SelectedScreen_MVP'));
	const body = mk('Panel', pg, '', 'Body');
	const okBox = mk('Panel', body, '', 'AsyncSuccessContainer');
	const car = mk('Panel', okBox, 'ScreensCarousel');
	const team = (id, nav, people) => {
		const sc = mk('Panel', car, id, 'Team PostGameScreen');
		mk('Label', sc, 'MatchID', '', opts.match || 'Match 1001');
		const box = mk('CitadelPostGameTeam', sc, nav);
		people.forEach(p => player(box, p));
		return sc;
	};
	H.team1 = team('Team1Screen', 'Team1', [
		{ name: 'Me', local: true },
		{ name: 'Ally', mask: true }
	]);
	H.team2 = team('Team2Screen', 'Team2', [
		{ name: 'Foe', mask: true },
		{ name: 'DoneFoe', done: true },
		{ name: 'KindFoe', ret: true }
	]);
	H.score = mk('Panel', car, 'ScoreboardScreen', 'PostGameScreen Scoreboard');
	mk('Label', H.score, 'MatchID', '', opts.match || 'Match 1001');
	const board = mk('CitadelPostGameScoreboardNew', H.score, 'Scoreboard');
	player(board, { name: 'Me', local: true, cls: ['Team1'] });
	player(board, { name: 'Ally', cls: ['Team1'] });
	player(board, { name: 'Foe', cls: ['Team2'] });
	H.graphs = mk('Panel', car, 'GraphsScreen', 'PostGameScreen Graphs');
	mk('Label', H.graphs, 'MatchID', '', opts.match || 'Match 1001');
	const mvp = H.mvp = mk('CitadelPostGameProgressMVP', root, '', 'PostGameScreen');
	mk('Label', mvp, 'MatchID', '', opts.match || 'Match 1001');
	const spotBox = mk('Panel', mvp, '', 'MVPHeroContainer');
	mk('Panel', spotBox, 'MVPHeroSpotlight');
	const details = mk('Panel', mvp, '', 'MVPDetails Player');
	player(details, { name: 'MvpStar', mvp: true, mask: true });
	H.ctx = pg;
	return H;
};

const press = (b, xml) => { const hs = handlers.filter(h => h.p === b && h.ev === 'Activated'); if (hs.length) { hs.forEach(h => h.f(b)); return; } xml(); };
H.openMenu = () => {
	H.esc.cls.add('ShowEscapeMenu');
	if (!H.menu) {
		const m = H.menu = mk('Panel', H.esc, 'HudppPanel', 'HudppTheme_dockv2');
		const bar = mk('Panel', m, '', 'HudppTabs');
		H.tabs = {};
		[['hud', 'HUD']].forEach(([k, l]) => {
			const b = mk('Button', bar, '', 'HudppTab'); mk('Label', b, '', 'HudppTabLabel', l);
			b.events.onactivate = () => press(b, () => { H.tab = k; H.refresh(); });
			H.tabs[k] = b;
		});
		H.hudBody = mk('Panel', m, '', 'HudppBody HudppBodyHud'); filler(H.hudBody, 8, 'HudRow');
		const foot = H.foot = mk('Panel', m, '', 'HudppFoot'); const main = mk('Panel', foot, '', 'HudppFootMain');
		mk('Label', main, '', 'HudppStatus'); H.reset = mk('Button', main, '', 'HudppTextButton HudppResetAll');
	}
	H.menu.AddClass('HudppOpen'); H.refresh();
};
H.closeMenu = () => { if (H.menu) H.menu.RemoveClass('HudppOpen'); H.esc.cls.delete('ShowEscapeMenu'); };
H.refresh = () => { if (!H.menu) return; H.menu.SetHasClass('HudppTab_hud', true); };
H.setScreen = name => {
	['MVP', 'Team1', 'Team2', 'Scoreboard', 'Graphs'].forEach(s => H.pg.SetHasClass('SelectedScreen_' + s, s === name));
};

const shown = p => { for (let q = p; q; q = q.parent) if (q.applied.visibility === 'collapse') return false; return true; };
const load = src => { (0, eval)(src); };
module.exports = { C, resetCounts, advance, P, H, mk, buildPostGame, shown, press, load, storage, net, get handlers() { return handlers; }, get errors() { return errors; }, get info() { return info; }, get jobs() { return jobs; }, get now() { return now; } };
