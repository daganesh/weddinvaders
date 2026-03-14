# Weddin'Vaders — Agent Knowledge Base

Space Invaders-style cooperative two-player browser game built with React + Vite + Canvas, where a bride and groom shoot ammo at flying wedding items to fund and complete their wedding.

## Knowledge Files

| File | Description |
|------|-------------|
| [`knowledge/architecture.md`](knowledge/architecture.md) | Module overview, data flow, game loop, key entry points |
| [`knowledge/dev-environment.md`](knowledge/dev-environment.md) | Prerequisites, run/build commands, gotchas |
| [`knowledge/game-design.md`](knowledge/game-design.md) | Game phases, ammo types, item system, level structure, win/lose rules |
| [`knowledge/testing.md`](knowledge/testing.md) | How to verify changes (no automated tests — manual + preview server) |

## Skill Files

| File | When to use |
|------|-------------|
| [`skills/bug-fix.md`](skills/bug-fix.md) | Diagnosing and fixing runtime errors or broken game behaviour |
| [`skills/new-feature.md`](skills/new-feature.md) | Adding new items, levels, ammo types, phases, or UI changes |
| [`skills/write-test.md`](skills/write-test.md) | Manually verifying a feature works end-to-end in the preview |

## Keeping Knowledge Up to Date

After any change that affects **architecture, game design rules, or dev workflow**, update the relevant `.agents/knowledge/*.md` file in a separate commit:

```
git add .agents/knowledge/<file>.md
git commit -m "docs: update agent knowledge — <what changed>"
```

Changes that require a knowledge update:
- New source files or renamed modules → `architecture.md`
- New level, item type, ammo type, or phase → `game-design.md`
- New npm script, env var, or build step → `dev-environment.md`
