// Owldoku — generative song data for "Amber Hush"
// Consumed by the Music module in Owldoku.html (see the SONGS array).
// Slowest and sparsest track; a soft music-box chime rings out rarely
// over the held chords.
const SONG_AMBER_HUSH = {
  name:'Amber Hush',
  bpm:60, rain:false, drums:'none',
  melodyChance:0.22, dripChance:0, crackleChance:0.06,
  melodyStyle:'pad', padFilter:[450,950,500], melodyFilter:1700,
  instrument:'bell', instrumentChance:0.05,
  chords:[
    { notes:[174.61,220.00,261.63,329.63,440.00], scale:[174.61,196.00,220.00,233.08,261.63,293.66,329.63,349.23] }, // Fmaj7
    { notes:[130.81,164.81,196.00,246.94,329.63], scale:[130.81,146.83,164.81,174.61,196.00,220.00,246.94,261.63] }, // Cmaj7
    { notes:[146.83,174.61,220.00,261.63,349.23], scale:[146.83,164.81,174.61,196.00,220.00,246.94,261.63,293.66] }, // Dm7
    { notes:[116.54,146.83,174.61,220.00,293.66], scale:[116.54,130.81,146.83,155.56,174.61,196.00,220.00] }        // Bbmaj7
  ]
};
