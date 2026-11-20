#!/usr/bin/env python3
"""Add our style sheet and script includes to Valve's post-game layouts, unchanged otherwise.
Runtime code creates the button rows; these files only get the script loaded on those screens."""
import sys
from pathlib import Path

STYLE = '\t\t<include src="s2r://panorama/styles/deadlock_commend.vcss_c" />\n'
SCRIPT = '\t\t<include src="s2r://panorama/scripts/deadlock_commend.vjs_c" />\n'
BANNER = '<!-- Valve post-game layout + Deadlock Commend includes (tools/layout.py) -->\n'

def patch(src: str) -> str:
    if src.startswith('<!--'):
        src = src[src.index('-->') + 3:].lstrip()
    styles_end = '\t</styles>\n'
    scripts_end = '\t</scripts>\n'
    assert src.count(styles_end) == 1, 'styles block not found or not unique'
    assert src.count(scripts_end) == 1, 'scripts block not found or not unique'
    if 'deadlock_commend.vcss_c' not in src:
        src = src.replace(styles_end, STYLE + styles_end)
    if 'deadlock_commend.vjs_c' not in src:
        src = src.replace(scripts_end, SCRIPT + scripts_end)
    return BANNER + src

def main():
    src, dest = Path(sys.argv[1]), Path(sys.argv[2])
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(patch(src.read_text(encoding='utf-8')), encoding='utf-8')

if __name__ == '__main__':
    main()
