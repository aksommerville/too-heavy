# Too Heavy

Submission for the 2023-4 GDEX Winter Game Jam.

https://aksommerville.itch.io/too-heavy password "hocus-pocus".

https://github.com/aksommerville/too-heavy

## TODO

- By 7 January -- game jam submission
- - [ ] Guess gamepad mapping for unknown devices.
- Stretch goals, or after submission
- - [ ] More interesting song voices.
- - [ ] Capture and playback of sound effects, rather than synthesizing from scratch each time.
- - [x] Clean up and improve minification.
- - - [x] Maps could probably reduce to 5/8 if we switch to a binary format and base64 it. Would we benefit from RLE or some other very simple compression? Row filtering?
- - - - Everything other than image and script (maps, songs, framing) adds up to like 30 kB. Not worth the effort to reduce.
- - - [x] Plenty of opportunity to eliminate whitespace in JS, inline constants, shorten private identifiers, etc. Or should we use an existing tool? They'll do it better.
- - - - We could still benefit enormously by inlining constants and reducing length of identifiers. But to do either of those, we'd need a real minifier.
- - - [x] Eliminate unused space from the image.
- - [ ] Touch input.
- - [x] Some way to run without a browser. Electron, or build our own thing?
- - - Definitely going to look into this, but that will be its own project.
- - [x] What would it take to generate a source map? Kind of painful looking up errors in index.html...
- - - ...whatever

## High Scores

| Medals | Time     | Date       | Comment |
|--------|----------|------------|---------|
| DIE    | 4:31.098 | 2023-12-30 | |
| ---    | 2:18.716 | 2023-12-30 | Not even close. Under 2:00 is possible for sure. |
