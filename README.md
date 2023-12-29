# Too Heavy

Submission for the 2023-4 GDEX Winter Game Jam.

https://aksommerville.itch.io/too-heavy password "hocus-pocus".

https://github.com/aksommerville/too-heavy

## TODO

- By 1 January
- - [ ] Crusher kills you from the platform end, if you touch a wall while rising. (it shouldn't)
- - [ ] Stopwatch: Visual feedback while running.
- - [ ] Both Toy School and the real challenges, it's too hard to get back home after completing. Warp back?
- - [ ] Revist respawn. Prevent accidentally walking offscreen right after, prevent excessive auto-death.
- - - I think the set-a-respawn-point when standing still logic has to go.
- - - [ ] Try this: Respawn always at the entry point, and allow movement fast but prevent doors from working for a second or so
- - [ ] Final maps.
- - [x] Tutorial 1: Playing With Toys
- - - [x] Forbid using wrong items
- - - [x] Static education about broom height limit, it's not obvious.
- - - [x] Keep score.
- - - [x] Camera: Add switch door, once that's made
- - - [x] Bell: How is this going to work?
- - [x] Tutorial 2: The Magic Is In You
- - - [x] Forbid using items.
- - - [x] Keep score.
- - [ ] Tutorial 3: Admin
- - [ ] Can vacuum onto hazards safely -- should kill you.
- - [ ] Cannonball isn't happening if you enter from the top with it already started. (visually right, but only getting the "land" sound). eg end of jump lessons.
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
