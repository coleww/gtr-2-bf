/*
The MIT License (MIT)

Copyright (c) 2014 Chris Wilson

Permission is hereby granted,
 free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

window.AudioContext = window.AudioContext || window.webkitAudioContext;

var audioContext = new AudioContext();
var isPlaying = false;
var sourceNode = null;
var analyser = null;
var theBuffer = null;
var noteElem;
var WIDTH=300;
var CENTER=150;
var HEIGHT=42;
var confidence = 0;
var currentPitch = 0;
var brainfuck = [];



function error() {
    alert('Stream generation failed.');
}

function getUserMedia(dictionary, callback) {
    try {
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        navigator.getUserMedia(dictionary, callback, error);
    } catch (e) {
        alert('getUserMedia threw exception :' + e);
    }
}

function gotStream(stream) {
    // Create an AudioNode from the stream.
    var mediaStreamSource = audioContext.createMediaStreamSource(stream);

    // Connect it to the destination.
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    mediaStreamSource.connect( analyser );
    window.setInterval(function(){
      updatePitch();
    }, 500);
}

function getLiveInput() {
    getUserMedia({audio:true}, gotStream);
}

var tracks = null;
var buflen = 2048;
var buf = new Uint8Array( buflen );
var MINVAL = 134;  // 128 == zero.  MINVAL is the "minimum detected signal" level.

var noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function noteFromPitch( frequency ) {
  var noteNum = 12 * (Math.log( frequency / 440 )/Math.log(2) );
  return Math.round( noteNum ) + 69;
}

function frequencyFromNoteNumber( note ) {
  return 440 * Math.pow(2,(note-69)/12);
}

function centsOffFromPitch( frequency, note ) {
  return ( 1200 * Math.log( frequency / frequencyFromNoteNumber( note ))/Math.log(2) );
}

function autoCorrelate( buf, sampleRate ) {
  var MIN_SAMPLES = 4;  // corresponds to an 11kHz signal
  var MAX_SAMPLES = 1000; // corresponds to a 44Hz signal
  var SIZE = 1000;
  var best_offset = -1;
  var best_correlation = 0;
  var rms = 0;

  confidence = 0;
  currentPitch = 0;

  if (buf.length < (SIZE + MAX_SAMPLES - MIN_SAMPLES))
    return;  // Not enough data

  for (var i=0;i<SIZE;i++) {
    var val = (buf[i] - 128)/128;
    rms += val*val;
  }
  rms = Math.sqrt(rms/SIZE);

  for (var offset = MIN_SAMPLES; offset <= MAX_SAMPLES; offset++) {
    var correlation = 0;

    for (var i=0; i<SIZE; i++) {
      correlation += Math.abs(((buf[i] - 128)/128)-((buf[i+offset] - 128)/128));
    }
    correlation = 1 - (correlation/SIZE);
    if (correlation > best_correlation) {
      best_correlation = correlation;
      best_offset = offset;
    }
  }
  if ((rms>0.01)&&(best_correlation > 0.01)) {
    confidence = best_correlation * rms * 10000;
    currentPitch = sampleRate/best_offset;
    // console.log("f = " + sampleRate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")")
  }
//  var best_frequency = sampleRate/best_offset;
}

var $brainfuck = $(".brainfuck");

function updatePitch() {
  var cycles = new Array;
  analyser.getByteTimeDomainData( buf );

  // possible other approach to confidence: sort the array, take the median; go through the array and compute the average deviation
  autoCorrelate( buf, audioContext.sampleRate );



//BLINK A THING! LOL




  if (confidence <10) {
    noteElem.innerText = "-";
  } else {
    var note =  noteFromPitch( currentPitch );
    noteElem.innerHTML = noteStrings[note%12];
    var string_note = brainfuckify(noteStrings[note%12]);
    brainfuck.push(string_note);
    $("#input").text(brainfuck.join(""))
    //$("#code").text(brainfuck.join(""))
    console.log(brainfuck.join(""));
    // $brainfuck.append(string_note);WHY WHY WHY DO U BOT WIRJQWEOGNAKDJGSBAKSGB
  }
}

BRAIN_FUCK_MAP = {
  "A": ">",
  "B": "<",
  "C": "[",
  "D": ",",
  "E": "+",
  "F": "-",
  "G": ".",
  };

var loop = false;

function brainfuckify(note){
  var code = BRAIN_FUCK_MAP[note[0]];
  if(code == "["){
    if(loop) code = "]";
    loop = !loop;
  }
  return code;
}

$(function() {
  getLiveInput();
  noteElem = document.getElementById( "note" );
  
  $(".runit").click(function(){
    $("#input").val(brainfuck.join(""))
    $("#code").val(brainfuck.join(""))
    var beef = new Brainfuck(brainfuck.join(""))
    console.log(beef.run())
  })
});
