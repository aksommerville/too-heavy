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
    this.noise = null;
    
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
  
  soundEffect(sfxid) {
    switch (sfxid) {
      case "jump0": return this.beginSynthSound([
          { f: [300, 0.300,600], l: [0.0, 0.080,1, 0.070,0.200, 0.150,0], mod: 1, range: [0, 0.300,3] },
        ], 0.300);
      case "jump1": return this.beginSynthSound([
          { f: [450, 0.500,900], l: [0.0, 0.080,1, 0.070,0.200, 0.300,0], mod: 1, range: [0, 0.450,3] },
        ], 0.400);
      case "jump2": return this.beginSynthSound([
          { f: 600, l: [0, 0.060,1, 0.090,0.200, 1.0,0], mod: 1, range: [0, 0.100,2, 1.0,0] },
          { f: [600, 0.050,900], l: [0, 0.100,0.100, 1.0,0], mod: 1, range: [0, 0.100,2, 1.0,0] },
          { f: [600, 0.050,1200], l: [0, 0.100,0.200, 1.0,0], mod: 1, range: [0, 0.100,2, 1.0,0] },
          { f: [300, 0.750,600], l: [0, 0.090,0.200, 0.500,0] },
        ], 0.300);
      case "jumpWall": return this.beginSynthSound([
          { f: [450, 0.200,500, 0.200,600], l: [0, 0.100,1, 0.100,0.200, 0.200,0], mod: 0.5, range: [2, 0.400,0] },
        ], 0.250);
      case "jumpLong": return this.beginSynthSound([
          { f: [300, 0.200,1200, 0.500,600], l: [0, 0.100,1, 0.100,0.200, 0.500,0] },
        ], 0.300);
      case "jumpDown": return this.beginSynthSound([
          { f: [600, 0.500,300], l: [0, 0.120,1, 0.080,0.250, 0.200,0] },
        ], 0.300);
      case "dash": return this.beginSynthSound([
          { f: [600, 1.000,150], l: [0, 0.060,1, 0.060,0, 0.080,0.500, 0.080,0, 0.100,0.200,0.100,0, 0.150,0.100,0.150,0] },
        ], 0.400);
      case "dashReject": return this.beginSynthSound([
          { f: 150, l: [0, 0.120,1, 0.100,0.200, 0.280,0], mod: 0.5, range: 3 },
        ], 0.250);
      case "die": return this.beginSynthSound([
          { 
            f: 200,       l: [0, 0.070,1, 0.060,0, 0.080,0.5, 0.080,0, 0.100,0.25, 0.150,0],
            mod: 0.5, range: [0, 0.070,3, 0.060,0, 0.080,2.0, 0.080,0, 0.100,1.00, 0.150,0],
          },
        ], 0.300);
      case "land": return this.beginSynthSound([
          { f: [100, 0.250,40], l: [0, 0.050,1, 0.050,0.080, 0.200,0], mod: 1.1, range: [4, 0.250,1] },
        ], 0.100);
      case "switchOn": return this.beginSynthSound([
          { f: [160, 0.130,80], l: [0, 0.030,1, 0.100,0 ], mod: 1, range: [0, 0.130,2] },
        ], 0.300);
      case "switchOff": return this.beginSynthSound([
          { f: [80, 0.160,160], l: [0, 0.030,1, 0.130,0 ], mod: 1, range: 2 },
        ], 0.300);
      case "deliverItem": return this.beginSynthSound([
          {
            f: [600, 0.600,600, 0.020,800],
            l: [0,
              0.120,0.900, 0.200,0.125, 0.080,0,
              0.060,0.750, 0.100,0.100, 0.040,0,
              0.070,1.000, 0.150,0.200, 0.400,0,
            ],
            mod: 2,
            range: [0,
              0.120,0.900, 0.280,0,
              0.060,0.750, 0.140,0,
              0.070,1.000, 0.550,0,
            ],
          },
          {
            f: [755, 0.600,755, 0.020,1200],
            l: [0,
              0.120,0.900, 0.200,0.125, 0.080,0,
              0.060,0.750, 0.100,0.100, 0.040,0,
              0.070,1.000, 0.150,0.200, 0.400,0,
            ],
            mod: 2,
            range: 1,
          },
        ], 0.350);
      case "pause": return this.beginSynthSound([
          { f: [700, 0.100,600, 0.200,600], l: [0, 0.100,1, 0.80,0.100, 0.100,0], mod:0.5, range:1 },
        ], 0.150);
      case "resume": return this.beginSynthSound([
          { f: [600, 0.100,700, 0.200,700], l: [0, 0.100,1, 0.80,0.100, 0.100,0], mod:0.5, range:1 },
        ], 0.150);
      case "uiMotion": return this.beginSynthSound([
          { f: 1000, l: [0, 0.040,1, 0.080,0.125, 0.150,0], mod: 2, range: [3, 0.270,0] },
        ], 0.125);
      case "cannonballBreak": return this.beginSynthSound([
          { f: [400, 0.000,400, 1.000,200], l: [0, 0.000,0, 0.100,1.000, 0.100,0.125, 0.775,0], mod: 1, range: [0, 2,3] },
          { f: [420, 0.070,420, 1.000,200], l: [0, 0.070,0, 0.100,0.800, 0.100,0.100, 0.775,0], mod: 1, range: [0, 2,3] },
          { f: [450, 0.140,450, 1.000,200], l: [0, 0.140,0, 0.100,0.600, 0.100,0.080, 0.775,0], mod: 1, range: [0, 2,3] },
          { f: [500, 0.210,500, 1.000,200], l: [0, 0.210,0, 0.100,0.400, 0.100,0.060, 0.775,0], mod: 1, range: [0, 2,3] },
          { f: [600, 0.280,600, 1.000,200], l: [0, 0.280,0, 0.100,0.200, 0.100,0.040, 0.775,0], mod: 1, range: [0, 2,3] },
        ], 0.500);
      case "cannonballNoop": return this.beginSynthSound([
          { f: [300, 1.000,100], l: [0, 0.100,1, 0.100,0.125, 0.775,0], mod: 0.25, range: [2, 1,1] },
        ], 0.200);
      case "bell": return this.beginSynthSound([
          { f: 1200, l: [0, 0.030,1, 0.040,0.100, 0.600,0], mod: 3.5, range: 5 },
        ], 0.300);
      case "tick": return this.beginSynthSound([
          { shape: "noise", l: [0, 0.010,1, 0.030,0 ] },
        ], 0.200);
      case "cameraClick": return this.beginSynthSound([
          { shape: "noise", l: [0, 0.015,1, 0.030,0, 0.150,0, 0.020,0.200, 0.020,0] },
        ], 0.500);
      case "cameraTeleport": return this.beginSynthSound([
          {
            f: [400, 0.100,1200, 0.100,800, 0.100,1600, 0.100,1200, 0.100,2000],
            l: [0, 0.200,1, 0.300,0],
          },
        ], 0.300);
      case "vacuum": return this.beginSynthSound([
          { shape: "noise", l: [0, 0.200,1, 0.300,1, 0.200,0] },
          { f: 60, l: [0, 0.100,0, 0.400,0.500, 0.200,0], mod:0.6, range:3 },
        ], 0.200);
      case "vacuumMuffled": return this.beginSynthSound([
          { shape: "noise", l: [0, 0.200,1, 0.300,1, 0.200,0] },
          { f: 60, l: [0, 0.100,0, 0.400,0.800, 0.200,0], mod:0.6, range:3 },
        ], 0.150);
      case "umbrellaDeploy": return this.beginSynthSound([
          { f: [400, 0.500,800], l: [0, 0.100,1, 0.100,0.200, 0.300,0], mod: 2, range: [1, 0.500,2] },
        ], 0.300);
      case "umbrellaRetract": return this.beginSynthSound([
          { f: [600, 0.500,400], l: [0, 0.100,1, 0.100,0.200, 0.300,0], mod: 2, range: [2, 0.500,1] },
        ], 0.300);
      case "boots": return this.beginSynthSound([
          { f: [70, 0.080,80, 0.080,50], l: [0, 0.080,1, 0.080,0], mod: 1.4, range: [1, 0.080,4, 0.080,1] },
          { shape: "noise", l: [0, 0.080,0.400, 0.080,0] },
        ], 0.250);
      case "grappleThrow": return this.beginSynthSound([
          { f: [500, 0.200,1000], l: [0, 0.080,1, 0.050,0.200, 0.070,0], mod: 1, range: [0, 0.200,2] },
        ], 0.300);
      case "grappleCatch": return this.beginSynthSound([
          { f: [160, 0.200,160, 0.050,220], l: [0, 0.020,1, 0.180,0, 0.030,0.500, 0.120,0], mod: 0.800, range: 4 },
        ], 0.100);
      case "raft": return this.beginSynthSound([
          { f: [500, 0.200,300, 0.200,700], l: [0, 0.090,1, 0.120,0.125, 0.200,0], mod: 2, range: [3, 0.400,0] },
        ], 0.300);
      case "door": return this.beginSynthSound([
          { f: [400, 0.400,450], l: [0, 0.100,1, 0.300,0], mod: 1, range: [2, 0.400,0] },
        ], 0.150);
      default: console.log(`TODO AudioManager.soundEffect ${sfxid}`);
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
    const master = 0.200; // <-- overall music level here
    const attackLevel = master;
    const sustainLevel = master * 0.250;
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
    //TODO. This was going to be for drums, but neither of our songs uses drums.
    // I ended up not using any system of numbered sound effects, so if we do want this eventually, it will take some work setting that up.
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
    if (!this.noise) {
      this.noise = new AudioBuffer({ length: 10000, sampleRate: this.context.sampleRate });
      const noiseRaw = this.noise.getChannelData(0);
      for (let i=noiseRaw.length; i-->0; ) noiseRaw[i] = Math.random() * 2 - 1;
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
  
  /* (voices) is an array of:
   * {
   * TUNED VOICES:
   *   f: Frequency, hz. Scalar or envelope.
   *   mod: Modulator rate, relative to carrier. Scalar only.
   *   range: Modulator range, scalar or envelope.
   * NOISE VOICES:
   *   shape: "noise",
   * ALL:
   *   l: Level envelope: [LEVEL0, DELAY1,LEVEL1, ..., DELAYN,LEVELN] Should begin and end with zero.
   * }
   */
  beginSynthSound(voices, trim) {
    if (!this.context) return;
    if ((voices || []).length < 1) return;
    const when = this.context.currentTime;
    const master = new GainNode(this.context);
    master.gain.value = trim || 1;
    let voiceCount = voices.length;
    let endTime = 0;
    let signaller = null;
    
    for (const voice of voices) {
      const production = this.audioNodeForVoice(voice, when);
      if (!production) continue;
      production.node.connect(master);
      if (!signaller) signaller = production.signaller;
      if (production.endTime > endTime) endTime = production.endTime;
    }
    
    if (signaller) {
      signaller.stop(endTime);
      signaller.onended = () => {
        master.disconnect();
      };
    } else {
      console.log(`!!! no signaller for sound effect. discarding`);
      return;
    }
    master.connect(this.context.destination);
  }
  
  /* => { node, signaller, endTime } | null
   */
  audioNodeForVoice(voice, when, onended) {
    if (!voice) return null;
    let oscillator = null;
    if (voice.shape === "noise") {
      oscillator = this.noiseOscillatorForVoice(voice, when);
    } else if (voice.mod && voice.range) {
      oscillator = this.fmOscillatorForVoice(voice, when);
    } else if (voice.f instanceof Array) {
      oscillator = this.slidingOscillatorForVoice(voice, when);
    } else if (voice.f) {
      oscillator = this.flatOscillatorForVoice(voice, when);
    }
    if (!oscillator) return null;
    const master = this.gainNodeForVoice(voice, when);
    oscillator.connect(master);
    return { node: master, signaller: oscillator, endTime: when + this.calculateEndTimeForVoice(voice) };
  }
  
  calculateEndTimeForVoice(voice) {
    let endTime = 0;
    for (let i=1; i<voice.l.length; i+=2) endTime += voice.l[i];
    return endTime;
  }
  
  noiseOscillatorForVoice(voice, when) {
    const node = new AudioBufferSourceNode(this.context, { buffer: this.noise, loop: true, loopEnd: 9999 });
    node.start();
    return node;
  }
  
  fmOscillatorForVoice(voice, when) {
    const carrier = new OscillatorNode(this.context, {
      type: "sine",
      frequency: (typeof(voice.f) === "number") ? voice.f : voice.f[0],
    });
    const modulator = new OscillatorNode(this.context, {
      type: "sine",
      frequency: carrier.frequency.value * voice.mod,
    });
    const modGain = new GainNode(this.context);
    //TODO I don't get why we have to multiply range by frequency. It's definitely wrong, since we're only using the initial frequency.
    // Not going to obsess over that... If it sounds OK, it's OK.
    modGain.gain.value = ((typeof(voice.range) === "number") ? voice.range : voice.range[0]) * carrier.frequency.value;
    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    
    if (voice.f instanceof Array) {
      for (let i=1, t=when; i<voice.f.length; i+=2) {
        t += voice.f[i];
        carrier.frequency.linearRampToValueAtTime(voice.f[i+1], t);
        modulator.frequency.linearRampToValueAtTime(voice.f[i+1] * voice.mod, t);
      }
    }
    
    if (voice.range instanceof Array) {
      for (let i=1, t=when; i<voice.range.length; i+=2) {
        t += voice.range[i];
        modGain.gain.linearRampToValueAtTime(voice.range[i+1] * carrier.frequency.value, t);
      }
    }
    
    carrier.start();
    modulator.start();
    return carrier;
  }
  
  slidingOscillatorForVoice(voice, when) {
    const options = {
      frequency: voice.f[0],
      type: "sine",
    };
    const node = new OscillatorNode(this.context, options);
    for (let i=1, t=when; i<voice.f.length; i+=2) {
      t += voice.f[i];
      node.frequency.linearRampToValueAtTime(voice.f[i+1], t);
    }
    node.start();
    return node;
  }
  
  flatOscillatorForVoice(voice, when) {
    const options = {
      frequency: voice.f,
      type: "sine",
    };
    const node = new OscillatorNode(this.context, options);
    node.start();
    return node;
  }
  
  gainNodeForVoice(voice, when) {
    const node = new GainNode(this.context);
    node.gain.value = voice.l[0];
    node.gain.setValueAtTime(voice.l[0], when);
    let endTime = when;
    for (let i=1; i<voice.l.length; i+=2) {
      endTime += voice.l[i];
      node.gain.linearRampToValueAtTime(voice.l[i+1], endTime);
    }
    return node;
  }
}

AudioManager.singleton = true;
