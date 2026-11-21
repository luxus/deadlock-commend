# Deadlock Commend

Post-game buttons in [Deadlock](https://store.steampowered.com/app/1422450/Deadlock/) to commend your team, the enemy, everyone, or to return commends.

Written from scratch. It contains no code or assets from other commend mods. Settings use our Addon Settings library, vendored from [Improved Quickbuy](https://github.com/luxus/improved-quickbuy) (library 1.1.3, BUILD 5).

Listed in the [luxus Deadlock mods](https://luxus.github.io/deadlock-mods/) registry.

## What it does

- Four buttons on the Team, Scoreboard and MVP post-game screens: Team, Enemy, All, Return
- One "Commend buttons" toggle in settings (on by default)
- A "Commend" tab in [CompLock HUD++](https://deadlockconfig.com/), or an ADDONS window in the Esc menu without HUD++
- "Reset Commend" on the right of the settings foot puts the toggle back to the default
- Toggle descriptions appear as a tooltip on hover, like HUD++'s own rows
- The script loads only with the post-game layouts. While the buttons can be shown it ticks at 1 Hz; it does not walk the game's commend controls until a button is pressed

Valve's post-game layouts change. Runtime injection is used so a layout drift is less likely to blank the screen; that still needs a finished match to confirm. The buttons appear on the post-game Team, Scoreboard and MVP screens, not in the main menu.

## Build

Needs [modlock](https://github.com/paralin/modlock) (or set `MODLOCK` to a local copy) for the VPK step. Assemble and tests do not need it.

```sh
# optional: MODLOCK=/path/to/modlock
sh tools/assemble.sh
node test/test.js
sh test/mutants.sh
sh tools/build.sh   # writes build/deadlock-commend.vpk
```

## Install

Do this only while Deadlock is not running.

- With [shiv](https://github.com/luxus/shiv) or [Deadlock Mod Manager](https://deadlockmods.app/): add the source `https://luxus.github.io/deadlock-mods/dmm-source.json` and install Deadlock Commend, or use the buttons on https://luxus.github.io/deadlock-mods/ and https://luxus.github.io/deadlock-commend/.
- Manual: download `deadlock-commend-1.0.0.vpk` from the [GitHub release](https://github.com/luxus/deadlock-commend/releases/tag/v1.0.0), rename it to a free slot such as `pak08_dir.vpk` or later, and put it into `Deadlock/game/citadel/addons/`. Slots 01–07 are reserved for CompLock. [CompLock HUD++](https://deadlockconfig.com/) is optional.

Start Deadlock, finish a match, and check the console for `Deadlock Commend: 1.0.0 loaded`.

## License

MIT for this project's own code (Kai Löhnert / luxus). Valve's vanilla post-game layouts in `vanilla/` remain Valve Corporation's property.
