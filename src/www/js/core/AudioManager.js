/* AudioManager.js
 */
 
const AUDIO_FRAME_RATE = 44100; // TODO configurable? or are we allowed to say like zero for "don't care"?
const POLL_INTERVAL_MS = 1000; // When background music playing, poll this often and schedule events out further than this.
const POLL_SCHEDULE_LENGTH_S = 2.0;
 
export class AudioManager {
  static getDependencies() {
    return [Window];
  }
  constructor(window) {
    this.window = window;
    
    this.context = null;
    this.warnedAboutNotSupported = false;
    this.song = null;
    this.songp = 0;
    this.songpLoop = 0;
    this.songTempo = 0; // s/tick
    this.songLastEventTime = 0; // sec, from context
    this.poller = null;
    
    this.oscillatorTypeByChid = [
      "sine",
      "sawtooth",
      "sine",
      "sine",
    ];
  }
  
  /* This must be done after the first user interaction, we can't do it at construction.
   */
  reset() {
    if (!this.context && !this.initializeContext()) return;
    if (this.context.state === "suspended") {
      this.context.resume();
    }
    this.songLastEventTime = this.context.currentTime;
    if (this.song && !this.poller) {
      this.poller = this.window.setInterval(() => this.update(), POLL_INTERVAL_MS);
      this.update();
    }
  }
  
  stop() {
    if (!this.context) return;
    this.context.suspend();
    if (this.poller) {
      this.window.clearInterval(this.poller);
      this.poller = null;
    }
  }
  
  /* Uint8Array of encoded song (our private format), or null to stop any music.
   * We hold on to the provided array and read from it on the fly. Do not modify content.
   * It's OK to do this when paused or not initialized; it will take effect when we resume.
   */
  playSong(serial) {
    this.endSong();
    if (!serial || !serial.length || (serial.length < 3)) return;
    const tempo = serial[0];
    const startp = serial[1];
    const loopp = serial[2];
    if (tempo < 1) return;
    if (startp < 3) return;
    if (loopp && (loopp < startp)) return; // loopp zero means never loop, it's legal
    if ((startp >= serial.length) || (loopp >= serial.length)) return;
    this.song = serial;
    this.songp = startp;
    this.songpLoop = loopp;
    this.songTempo = tempo / 1000;
    if (this.context) {
      this.songLastEventTime = this.context.currentTime;
    }
    if (this.context && !this.poller) {
      this.poller = this.window.setInterval(() => this.update(), POLL_INTERVAL_MS);
      this.update(); // importantly, update once to catch the earliest events
    }
  }
  
  playNote(chid, noteid, velocity, dur, when) {
    if (!this.context) return;
    if (!when) when = this.context.currentTime;
    const frequency = 440 * 2 ** ((noteid - 0x45) / 12);
    const oscillatorOptions = {
      frequency,
      type: this.oscillatorTypeByChid[chid & 3],
    };
    const oscillator = new OscillatorNode(this.context, oscillatorOptions);
    oscillator.start();
    const attackLevel = 0.250;
    const sustainLevel = 0.100;
    const attackTime = 0.030;
    const decayTime = 0.080;
    const releaseTime = 0.400;
    const gainNode = new GainNode(this.context);
    gainNode.gain.value = 0;
    gainNode.gain.setValueAtTime(0, when);
    gainNode.gain.linearRampToValueAtTime(attackLevel, when + attackTime);
    gainNode.gain.linearRampToValueAtTime(sustainLevel, when + attackTime + decayTime);
    gainNode.gain.setValueAtTime(sustainLevel, when + attackTime + decayTime + dur);
    gainNode.gain.linearRampToValueAtTime(0, when + attackTime + decayTime + dur + releaseTime);
    oscillator.connect(gainNode);
    gainNode.connect(this.context.destination);
    oscillator.stop(when + attackTime + decayTime + dur + releaseTime);
    oscillator.onended = () => {
      oscillator.disconnect();
    };
  }
  
  playSound(noteid, velocity, when) {
    if (!this.context) return;
    if (!when) when = this.context.currentTime;
    //TODO
  }
          
/* ----- client shouldn't need anything below ----- */
  
  endSong() {
    //TODO drop any notes in flight? (everything is self-terminating so maybe it's ok not to)
    this.song = null;
    this.songp = 0;
    this.songpLoop = 0;
    this.songTempo = 0;
    if (this.poller) {
      this.window.clearInterval(this.poller);
      this.poller = null;
    }
  }
  
  initializeContext() {
    if (this.window.AudioContext) {
      this.context = new this.window.AudioContext({
        sampleRate: AUDIO_FRAME_RATE,
        latencyHint: "interactive",
      });
    } else {
      if (!this.warnedAboutNotSupported) {
        this.window.console.warn(`AudioContext not found. Will not produce audio.`);
        this.warnedAboutNotSupported = true;
      }
      return false;
    }
    return true;
  }
  
  update() {
    for (let panic=0; ; panic++) {
      if (!this.song) return; // can end during processing
      if (panic >= 1000) {
        this.window.console.error(`Processed 1000 song events without an interruption. Is the song empty? Is its tempo broken? Dropping it.`);
        this.endSong();
        return;
      }
      const [delayS, delayLen] = this.readSongDelay();
      const adjustedDelay = this.songLastEventTime + delayS - this.context.currentTime;
      if (adjustedDelay > POLL_SCHEDULE_LENGTH_S) return;
      if ((this.songp += delayLen) >= this.song.length) {
        this.songp = this.songpLoop;
      }
      this.songLastEventTime = this.context.currentTime + adjustedDelay;
      this.readAndDeliverSongEvent(this.songLastEventTime);
    }
  }
  
  readSongDelay() {
    let futurep = this.songp;
    let delayTicks = 0, len = 0;
    while (1) {
      if (futurep >= this.song.length) {
        if (!this.songpLoop) {
          if (!delayTicks) {
            this.endSong();
            return [9999, 0];
          }
          break;
        }
        futurep = this.songpLoop;
      }
      if (this.song[futurep] & 0x80) break; // Delay commands are 0 in the high bit.
      delayTicks += this.song[futurep];
      len++;
      futurep++;
      if (len >= this.song.length) {
        this.window.console.error(`Song consists only of delays. The hell, guy? Don't do that.`);
        this.endSong();
        return [9999, 0];
      }
    }
    return [delayTicks * this.songTempo, len];
  }
  
  readAndDeliverSongEvent(when) {
    const a = this.song[this.songp++];
    switch (a & 0xe0) {
      case 0x80: {
          const b = this.song[this.songp++];
          const c = this.song[this.songp++];
          const chid = (a >> 3) & 3;
          const noteid = ((a & 0x07) << 4) | (b >> 4);
          const velocity = ((b & 0x0f) << 3) | ((b & 0x0f) >> 1); // scale to 0..127
          const durTicks = c;
          this.playNote(chid, noteid, velocity, durTicks * this.songTempo, when);
        } break;
      case 0xa0: {
          const b = this.song[this.songp++];
          const velocity = ((a & 0x1f) << 2);
          const noteid = b;
          this.playSound(noteid, velocity, when);
        } break;
      default: {
          this.window.console.error(`Unexpected leading byte ${a} in song`);
          return this.endSong();
        }
    }
  }
}

AudioManager.singleton = true;
