# Product captures

`chat.png`, `now.png`, `people.png`, `profile.png` and
`profile-mobile.png` are deterministic captures of the current shared React
components with non-personal fixture data. They are not redrawn reference
mockups and are safe to use on the landing and in README.

Regenerate them after material UI changes:

```bash
node scripts/verify-core-rework-group-surface.mjs --capture-dir public/landing --capture-only
node scripts/verify-profile-visual.mjs --capture-dir public/landing
```

The scripts check desktop/mobile overflow and browser runtime errors before
writing the files. A release smoke test against production remains a separate
gate.
