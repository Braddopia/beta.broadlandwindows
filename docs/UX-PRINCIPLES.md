# UX and animation principles

Every change to how the CRM looks, moves or is used follows these 20 principles. The shared motion settings
(easings, button press, pop-ups, banner, hit areas) live in `src/css/08-motion.css`; use them rather than
inventing new timings. Anyone whose device asks for less motion gets none (`prefers-reduced-motion`).

## Motion

| # | Principle | What it means in the CRM |
|---|-----------|--------------------------|
| 1 | Squash and stretch | A pressed button squashes slightly (`scale(.95)`) and springs back on release. |
| 2 | Anticipation (wind-up) | Something that is about to appear gives a small cue first: a pop-up starts a little low and small, then rises. |
| 3 | Staging (the focus) | One thing at a time has the eye: pop-ups dim and blur the page behind; the main action on a screen is the one filled button. |
| 4 | Pose to pose | Animate between two clear states (hidden and shown, off and on) with keyframes; avoid aimless looping movement. |
| 5 | Follow-through | Movement settles just past its mark and back (`--e-spring`), e.g. a pop-up, a button release, a tick appearing. |
| 6 | Slow in and slow out | Everything that moves eases (`--e-out`); nothing starts or stops at full speed. |
| 7 | Moving in arcs | Things that travel take a gentle curve, e.g. the banner at the bottom swings up rather than sliding straight. |
| 8 | Secondary action | A small supporting movement adds life without stealing focus, e.g. a button's icon lifts as the pointer arrives. |
| 9 | Snappy timing | Feedback in 80 to 120ms; things that move 250 to 400ms; never slower than half a second. |
| 10 | Exaggerated feedback | Make results obvious: an on/off button shows a tick or an empty circle; a saved change shows the banner with Undo; a wrong box shakes. |
| 11 | Solid drawing (3D) | Depth is consistent: one light source, soft shadows only on raised things (pop-ups, cards), never on flat controls. |
| 12 | Overall appeal | Calm, tidy and consistent: the house look in `05c-refinements.css` (squarer controls, no rainbow glow) wins over novelty. |

## Use

| # | Principle | What it means in the CRM |
|---|-----------|--------------------------|
| 13 | Fitts's law | The things used most are big and near where the hand already is; small buttons answer a few pixels beyond their edge. |
| 14 | Bigger hit areas | On touch screens every control is at least about 44px (2.75rem) tall; icon buttons are never smaller than 2.4rem. |
| 15 | Hick's law | Fewer choices at once means quicker decisions: show the main action, put the rest under More or in a menu, and keep lists filtered. |
| 16 | Miller's law | Group things into small chunks (about 5 to 9): the side menu sections, form groups, report sections. |
| 17 | Doherty threshold | The app answers within 400ms; anything slower shows that it is working (busy state, progress). |
| 18 | Postel's law | Be forgiving with what people type (spaces, commas, "1,200", "1200mm", lower case) and strict and tidy with what is shown back. |
| 19 | Jakob's law | People expect the CRM to work like the apps they already use: Esc closes, Ctrl+K searches, Enter sends, Undo on the banner. |
| 20 | Frequency of use | What is used every day is one click away and first in its list; rarely used settings can live deeper. |

## Checklist for a change

- Does each new button show a pressed state and a clear on/off state if it toggles?
- Do new movements use `--e-out` or `--e-spring` and finish within about 400ms?
- Is every new control at least finger sized on touch screens?
- Is there one clear main action on the screen, with the rest quieter?
- Does it still work, and stay still, with reduced motion turned on?
