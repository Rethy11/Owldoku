// Owldoku — generative song data for "Paper Lantern Drift"
// Consumed by the Music module in Owldoku.html (see the SONGS array).
// Same four chords as a straight loop would give, but the order takes
// a different, less predictable path through them.
const SONG_PAPER_LANTERN_DRIFT = {
  name:'Paper Lantern Drift',
  bpm:84, rain:false, drums:'light',
  melodyChance:0.5, dripChance:0.04, crackleChance:0.08,
  melodyStyle:'pluck', padFilter:[650,1400,600], melodyFilter:3000,
  chordOrder:[0,2,1,3],
  chords:[
    { notes:[196.00,246.94,293.66,392.00,493.88], scale:[196.00,220.00,246.94,261.63,293.66,329.63,369.99,392.00] }, // Gadd9
    { notes:[146.83,185.00,220.00,293.66,329.63], scale:[146.83,164.81,185.00,196.00,220.00,246.94,277.18,293.66] }, // Dadd9
    { notes:[164.81,196.00,246.94,293.66,392.00], scale:[164.81,185.00,196.00,220.00,246.94,261.63,293.66,329.63] }, // Em7
    { notes:[130.81,164.81,196.00,246.94,293.66], scale:[130.81,146.83,164.81,174.61,196.00,220.00,246.94,261.63] }  // Cmaj7add9
  ]
};
