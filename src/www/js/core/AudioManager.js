/* AudioManager.js
 */
 
//TODO Replace all call sites with egg.audio_play_sound. Eliminate this whole class.
const soundNames = [
  "",
  "jump0",
  "jump1",
  "jump2",
  "jumpWall",
  "jumpLong",
  "jumpDown",
  "dash",
  "dashReject",
  "die",
  "land",
  "switchOn",
  "switchOff",
  "deliverItem",
  "pause",
  "resume",
  "uiMotion",
  "cannonballBreak",
  "cannonballNoop",
  "bell",
  "tick",
  "cameraClick",
  "cameraTeleport",
  "vacuum",
  "vacuumMuffled",
  "umbrellaDeploy",
  "umbrellaRetract",
  "boots",
  "grappleThrow",
  "grappleCatch",
  "raft",
  "door",
];
 
export class AudioManager {
  static getDependencies() {
    return [];
  }
  constructor() {
  }
  
  playSong(songid, repeat=true) {
    egg.audio_play_song(0, songid, false, repeat);
  }
  
  soundEffect(sfxid) {
    egg.audio_play_sound(0, soundNames.indexOf(sfxid), 1.0, 0.0);
  }
}

AudioManager.singleton = true;
