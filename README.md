# Too Heavy

Submission for the 2023-4 GDEX Winter Game Jam.

https://aksommerville.itch.io/too-heavy password "hocus-pocus".

https://github.com/aksommerville/too-heavy

## TODO

- By 7 January -- game jam submission
- - [x] Nerf the broom room.
- - [x] Graphics for the grapple room.
- - [x] Cannonball doesn't always happen when you start right after walking off a ledge.
- - - I think in these cases, the duck begins while grounded, and walkresidual takes us off the edge.
- - [x] Can we avoid using a N edge door if we're going to fall right back?
- - [x] Pretty up sound effects, after some review.
- - - [x] Pause/resume, yuck
- - - [x] Down-jump and dash sound too much alike.
- - [x] Fireworks on special jumps.
- - [x] Shake camera after a cannonball.
- - [ ] Guess gamepad mapping for unknown devices.
- Stretch goals, or after submission
- - [ ] More interesting song voices.
- - [ ] Capture and playback of sound effects, rather than synthesizing from scratch each time.
- - [ ] Clean up and improve minification.
- - - [ ] Maps could probably reduce to 5/8 if we switch to a binary format and base64 it. Would we benefit from RLE or some other very simple compression? Row filtering?
- - - [ ] Plenty of opportunity to eliminate whitespace in JS, inline constants, shorten private identifiers, etc. Or should we use an existing tool? They'll do it better.
- - - [ ] Eliminate unused space from the image.
- - [ ] Touch input.
- - [ ] Some way to run without a browser. Electron, or build our own thing?
- - [ ] What would it take to generate a source map? Kind of painful looking up errors in index.html...

## High Scores

| Medals | Time     | Date       | Comment |
|--------|----------|------------|---------|
| DIE    | 4:31.098 | 2023-12-30 | |
| ---    | 2:18.716 | 2023-12-30 | Not even close. Under 2:00 is possible for sure. |
