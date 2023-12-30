# Too Heavy

Submission for the 2023-4 GDEX Winter Game Jam.

https://aksommerville.itch.io/too-heavy password "hocus-pocus".

https://github.com/aksommerville/too-heavy

## TODO

- By 1 January
- - [x] Stopwatch: Visual feedback while running.
- - [ ] Final maps.
- - [x] Tutorial 3: Admin
- - [x] Cannonball isn't happening if you enter from the top with it already started. (visually right, but only getting the "land" sound). eg end of jump lessons.
- By 7 January -- game jam submission
- - [ ] Pretty up sound effects, after some review.
- - - [ ] Pause/resume, yuck
- - - [ ] Down-jump and dash sound too much alike.
- - [ ] Fireworks on special jumps.
- - [ ] WordBubbler: Exact stem alignment
- - [ ] WordBubbler: Rewrite text breaking, it's making poor choices
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
