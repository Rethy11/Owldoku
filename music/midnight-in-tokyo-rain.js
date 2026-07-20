// Owldoku — generative song data for "Midnight in Tokyo, Rain"
// Consumed by the Music module in Owldoku.html (see the SONGS array).
// The chord progression is the star here: it lingers three bars per
// chord, sits louder in the mix, and the melody stays out of its way.
const SONG_MIDNIGHT_IN_TOKYO_RAIN = {
  name:'Midnight in Tokyo, Rain',
  bpm:72, rain:true, drums:'full', barsPerChord:3,
  melodyChance:0.22, dripChance:0.1, crackleChance:0.12,
  melodyStyle:'pad', padFilter:[700,1500,650], melodyFilter:2400, padGainMult:1.3,
  chords:[
    { notes:[220.00,261.63,329.63,392.00,493.88], scale:[220.00,246.94,261.63,293.66,329.63,392.00,440.00,493.88] }, // Am9
    { notes:[146.83,174.61,220.00,261.63,329.63], scale:[146.83,174.61,196.00,220.00,261.63,293.66,329.63,349.23] }, // Dm9
    { notes:[196.00,246.94,293.66,369.99,440.00], scale:[196.00,220.00,246.94,293.66,329.63,369.99,392.00,440.00] }, // Gmaj7
    { notes:[130.81,164.81,196.00,246.94,329.63], scale:[130.81,164.81,196.00,220.00,246.94,293.66,329.63,392.00] }  // Cmaj7
  ]
};
