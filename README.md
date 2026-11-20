# Deadlock Commend

Post-game buttons in [Deadlock](https://store.steampowered.com/app/1422450/Deadlock/) to commend your team, the enemy, everyone, or to return commends.

This is a test build (`v1-test`). There is no GitHub Release and no DMM download yet. It is registered in [luxus/deadlock-mods](https://github.com/luxus/deadlock-mods) as unavailable until a release exists.

Written from scratch. It contains no code or assets from other commend mods. Settings and the Addon Settings library are ours, vendored from [Improved Quickbuy](https://github.com/luxus/improved-quickbuy).

## What it does

- Four buttons on the Team, Scoreboard and MVP post-game screens: Team, Enemy, All, Return
- One "Commend buttons" toggle in settings (default on in this test build)
- A "Commend" tab in [CompLock HUD++](https://deadlockconfig.com/), or an ADDONS window in the Esc menu without HUD++
- The script loads only with the post-game layouts. While the buttons can be shown it ticks at 1 Hz; it does not walk the game's commend controls until a button is pressed
- HUD++'s own panels never get event handlers

Valve's post-game layouts change. Runtime injection is used so a layout drift is less likely to blank the screen; that still needs a real match to confirm.

## Build

Needs [modlock](https://github.com/luxus/modlock) (or set `MODLOCK` to a local copy) for the VPK step. Assemble and tests do not need it.

```sh
# optional: MODLOCK=/path/to/modlock
sh tools/assemble.sh
node test/test.js
sh test/mutants.sh
sh tools/build.sh   # writes build/deadlock-commend.vpk
```

## Install a test VPK (manual)

Do this only while Deadlock is not running. This addon is its own pak, not part of Improved Quickbuy.

1. Quit Deadlock completely.
2. Go to `Deadlock/game/citadel/addons/`.
3. If you already have a third-party Commend pak, it is often `pak10_dir.vpk`. Move that file aside to `~/Downloads/deadlock-mods/` (create the folder if needed). Do not overwrite `pak04` (Improved Quickbuy) and do not edit `pak10` in place.
4. Copy `build/deadlock-commend.vpk` to a **free** slot as `pakNN_dir.vpk`. On lea, `pak09` is a reasonable free slot (`pak02`, `pak03`, `pak09`, `pak12` and others were free at the time of this test). If the chosen slot already has a file, back that file up first.
5. Start Deadlock, finish a match, and check the console for `Deadlock Commend: v1-test loaded`.

To go back: quit Deadlock, remove this pak, and restore the backup.

## License

MIT for this project's own code (Kai Löhnert / luxus). Valve's vanilla post-game layouts in `vanilla/` remain Valve Corporation's property.
