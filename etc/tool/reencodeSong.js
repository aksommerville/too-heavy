/* reencodeSong.js
 * (serial, path) => serial
 * Reads a standard MIDI file and outputs a similar but private format with all events in one stream.
 */
 
function receiveMThd(midi, chunk) {
  if (chunk.length < 6) throw new Error(`Unexpected length ${chunk.length} for MThd`);
  if (midi.division) throw new Error(`Multiple MThd`);
  const division = (chunk[4] << 8) | chunk[5];
  if ((division < 1) || (division >= 0x8000)) {
    throw new Error(`Unsupported value ${division} for MThd.division.`);
  }
  midi.division = division;
}

/* From an encoded MIDI file, validate and return:
 * {
 *   division: integer ; ticks/qnote
 *   tracks: Buffer[]
 * }
 */
function splitMidiFile(src) {
  const midi = {
    division: 0, // zero is a signal that we haven't found MThd
    tracks: [],
  };
  for (let srcp=0; srcp<src.length; ) {
    if (srcp > src.length - 8) throw new Error(`Unexpected extra data at end of MIDI file.`);
    const chunkid = src.toString("utf8", srcp, srcp + 4);
    const paylen = (src[srcp+4] << 24) | (src[srcp+5] << 16) | (src[srcp+6] << 8) | src[srcp+7];
    srcp += 8;
    if ((paylen < 0) || (srcp > src.length - paylen)) {
      throw new Error(`Chunk exceeds EOF`);
    }
    const chunk = src.slice(srcp, srcp + paylen);
    srcp += paylen;
    switch (chunkid) {
      case "MThd": receiveMThd(midi, chunk); break;
      case "MTrk": midi.tracks.push(chunk); break;
    }
  }
  if (!midi.division) throw new Error(`No MThd chunk in MIDI file`);
  if (!midi.tracks.length) throw new Error(`MIDI file has no tracks`);
  return midi;
}

/* Read VLQ from a track reader.
 */
 
function readVlq(track) {
  let v = 0;
  for (let panic=4; panic-->0; ) {
    if (track.p >= track.src.length) throw new Error(`Unexpected EOF reading VLQ`);
    const b = track.src[track.p++];
    v <<= 7;
    v |= b & 0x7f;
    if (!(b & 0x80)) return v;
  }
  throw new Error(`VLQ length exceeds 4 bytes`);
}

/* Read an event from a track reader.
 * Advances (track.p), sets (track.delay=-1), updates (track.status), and returns one of:
 *   { type: "Set Tempo", secPerQnote }
 *   { type: "Note On", chid, noteid, velocity }
 *   { type: "Note Off", chid, noteid, velocity }
 * We'll return other types too, but only as placeholders. Discard them.
 */
function readEvent(track) {
  track.delay = -1;
  if (track.p >= track.src.length) throw new Error(`Unexpected EOF reading event`);
  
  let status = track.src[track.p];
  if (status & 0x80) track.p++;
  else if (track.status) status = track.status;
  else throw new Error(`Unexpected leading byte ${status} reading event`);
  track.status = status;
  
  const REQ = (c) => { if (track.p > track.src.length - c) throw new Error(`Unexpected EOF reading event`); track.p += c; };
  switch (status & 0xf0) {
    case 0x80: {
        REQ(2);
        return {
          type: "Note Off",
          chid: status & 0x0f,
          noteid: track.src[track.p - 2],
          velocity: track.src[track.p - 1],
        };
      }
    case 0x90: {
        REQ(2);
        const noteid = track.src[track.p - 2];
        const velocity = track.src[track.p - 1];
        if (!velocity) return {
          type: "Note Off",
          chid: status & 0x0f,
          noteid,
          velocity: 0x40,
        }; else return {
          type: "Note On",
          chid: status & 0x0f,
          noteid,
          velocity,
        };
      }
    case 0xa0: REQ(2); return { type: "Note Adjust" };
    case 0xb0: REQ(2); return { type: "Control Change" };
    case 0xc0: REQ(1); return { type: "Program Change" };
    case 0xd0: REQ(1); return { type: "Channel Pressure" };
    case 0xe0: REQ(2); return { type: "Wheel" };
    case 0xf0: track.status = 0; switch (status) {
        case 0xf0: case 0xf7: {
            const paylen = readVlq(track);
            REQ(paylen);
            return { type: "Sysex" };
          } break;
        case 0xff: {
            REQ(1);
            const type = track.src[track.p - 1];
            const paylen = readVlq(track);
            REQ(paylen);
            if ((type === 0x51) && (paylen === 3)) return {
              type: "Set Tempo",
              secPerQnote: ((track.src[track.p - 3] << 16) | (track.src[track.p - 2] << 8) | track.src[track.p - 1]) / 1000000,
            };
            return { type: "Meta" }
          }
      }
  }
  throw new Error(`Unexpected event ${status}`);
}

/* With (division,tracks) set, produce a new member (events).
 * Each event is one Note On event:
 * {
 *   time: Absolute time in seconds.
 *   duration: seconds. Unused for channel 10.
 *   channel: 0..3 or 10 (NB This is our "channel", from the MTrk chunk index. MIDI Channel is discarded)
 *   noteid: 0..127
 *   velocity: 0..127
 * }
 * We verify that every Note On got a corresponding Note Off, and hence has a valid duration.
 */
function flattenEvents(midi) {
  const events = [];
  const tracks = midi.tracks.map((src, chid) => ({
    src,
    chid: chid & 3,
    p: 0,
    delay: -1, // <0 if we need to read from (src)
    done: false,
    status: 0,
  }));
  let time = 0;
  let secPerTick = 0; // per *input* tick; output tick rate hasn't been decided yet
  for (;;) {
  
    // Ensure each track reader has a delay or is done.
    // Capture the shortest delay from unfinished tracks.
    let shortest = 0x10000000; // not encodable as VLQ
    for (const track of tracks) {
      if (track.done) continue;
      if (track.p >= track.src.length) {
        track.done = true;
        continue;
      }
      if (track.delay < 0) {
        track.delay = readVlq(track);
      }
      if (track.delay < shortest) {
        shortest = track.delay;
      }
    }
    if (shortest >= 0x10000000) break; // All tracks done.
    
    // Add (shortest) to the clock and subtract it from each track.
    // If we haven't received Set Tempo yet, default it. We require it before the first delay.
    if (shortest) {
      if (!secPerTick) secPerTick = 0.5 / midi.division;
      time += shortest * secPerTick;
      for (const track of tracks) {
        if (track.done) continue;
        track.delay -= shortest;
      }
    }
    
    // Process events from any track with zero delay.
    for (const track of tracks) {
      if (track.done) continue;
      if (track.delay > 0) continue;
      const event = readEvent(track);
      switch (event.type) {
        case "Set Tempo": {
            if (secPerTick) {
              throw new Error(`Multiple Set Tempo events, or one after time zero. Please use a single Set Tempo at time zero.`);
            }
            secPerTick = event.secPerQnote / midi.division;
          } break;
        case "Note On": {
            if (event.chid === 9) {
              events.push({
                time,
                duration: 0,
                channel: 10,
                noteid: event.noteid,
                velocity: event.velocity,
              });
            } else {
              events.push({
                time,
                duration: -1,
                channel: track.chid,
                noteid: event.noteid,
                velocity: event.velocity,
              });
            }
          } break;
        case "Note Off": {
            const pv = events.find(e => e.channel === track.chid && e.noteid === event.noteid && e.duration < 0);
            if (pv) pv.duration = time - pv.time;
          } break;
        // Unknown (event.type) is fine, ignore them.
      }
    }
  }
  
  // Any unterminated note, give it duration zero. TODO Should we fail instead, or issue a warning?
  for (const event of events) {
    if (event.duration < 0) {
      event.duration = 0;
    }
  }
  midi.events = events;
}

/* (midi.events) are initially in absolute seconds.
 * Calculate an agreeable tick length, and convert all timestampts to absolute (output) ticks.
 * Sets (midi.ticklen).
 */
function calculateFinalTiming(midi) {
  /* We must emit event-to-event delays in 7 bits, and it's not too big a deal to go over.
   * Note durations must fit in 8 bits, and it's a problem if they go over.
   * Find the longest duration.
   * And it can be zero, i guess, if a song is empty or all drums.
   */
  /* OK actually... Trying to calculate the longest acceptable tick length led to some high choices that ended up screwing up timing.
   * Just force it to 5 ms.
   *
  let longestDurationMs = midi.events.reduce((a, v) => ((a > v.duration) ? a : v.duration), 0) * 1000;
  let ticklenMs = longestDurationMs ? Math.ceil((1000 * 255) / longestDurationMs) : 50;
  if (ticklenMs < 1) {
    ticklenMs = 1;
  } else if (ticklenMs > 0xff) {
    ticklenMs = 0xff;
  }
  /**/
  ticklenMs = 5;
  // umm. yeah. let's go with that.
  midi.ticklen = ticklenMs;
  for (const event of midi.events) {
    event.time = Math.round((event.time * 1000) / ticklenMs);
    event.duration = Math.round((event.duration * 1000) / ticklenMs);
    if (event.duration > 0xff) {
      //TODO issue warning?
      event.duration = 0xff;
    }
  }
  
  // A little extra fix up: Sort by time (should be redundant, but rounding, who knows), and drop any delay from the first note.
  midi.events.sort((a, b) => a.time - b.time);
  if (midi.events[0].time > 0) {
    const rm = midi.events[0].time;
    for (const event of midi.events) {
      event.time -= rm;
    }
  }
}

/* With (events) finalized, generate the final output in our format.
 */
function encodeOutput(midi) {
  let dsta = 3 + midi.events.length * 4; // not exact but a reasonable estimate
  let dst = Buffer.alloc(dsta);
  let dstc = 0;
  const append = (b) => {
    if (dstc >= dsta) {
      dsta += 1024;
      const nv = Buffer.alloc(dsta);
      nv.set(dst);
      dst = nv;
    }
    dst[dstc++] = b;
  };
  
  /* Header.
   * (startp) and (loopp) are always 3.
   */
  dst[dstc++] = midi.ticklen;
  dst[dstc++] = 3;
  dst[dstc++] = 3;
  
  /* Events.
   */
  let now = 0;
  for (const event of midi.events) {
    let delay = event.time - now;
    while (delay >= 0x7f) {
      append(0x7f);
      delay -= 0x7f;
    }
    if (delay > 0) {
      append(delay);
    }
    now = event.time;
    if (event.channel === 10) {
      append(0xa0 | (event.velocity >> 2));
      append(event.noteid);
    } else {
      append(0x80 | (event.channel << 3) | (event.noteid >> 4));
      append((event.noteid << 4) | (event.velocity >> 3));
      append(event.duration);
    }
  }
  
  return dst.slice(0, dstc);
}
 
module.exports = (serial, path) => {
  try {
    const midi = splitMidiFile(serial);
    flattenEvents(midi);
    calculateFinalTiming(midi);
    const dst = encodeOutput(midi);
    return dst;
  } catch (e) {
    if (e.message) e.message = path + ": " + e.message;
    throw e;
  }
};
