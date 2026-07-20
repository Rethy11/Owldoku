// Owldoku — generative song data for "Late Bus Home"
// Consumed by the Music module in Owldoku.html (see the SONGS array).
// A warm electric-piano-style "keys" voice answers the pad every so often.
const SONG_LATE_BUS_HOME = {
  name:'Late Bus Home',
  bpm:66, rain:true, drums:'sparse',
  melodyChance:0.3, dripChance:0.15, crackleChance:0.15,
  melodyStyle:'pad', padFilter:[600,1200,550], melodyFilter:2000,
  instrument:'keys', instrumentChance:0.09,
  chords:[
    { notes:[164.81,196.00,246.94,293.66,369.99], scale:[164.81,185.00,196.00,220.00,246.94,261.63,293.66,329.63] }, // Em9
    { notes:[130.81,164.81,196.00,246.94,329.63], scale:[130.81,146.83,164.81,174.61,196.00,220.00,246.94,261.63] }, // Cmaj7
    { notes:[110.00,130.81,164.81,196.00,246.94], scale:[110.00,123.47,130.81,146.83,164.81,174.61,196.00,220.00] }, // Am9
    { notes:[123.47,146.83,185.00,220.00,293.66], scale:[123.47,138.59,146.83,164.81,185.00,196.00,220.00,246.94] }  // Bm7
  ]
};
