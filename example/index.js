import Granular from '../src/Granular';

import p5 from 'p5';
import 'p5/lib/addons/p5.sound';

async function getData(url) {
  return new Promise((resolve) => {
    const request = new XMLHttpRequest();

    request.open('GET', url, true);

    request.responseType = 'arraybuffer';

    request.onload = function() {
      const audioData = request.response;

      resolve(audioData);
    }

    request.send();
  });
}

async function init() {
  const audioContext = p5.prototype.getAudioContext();
  
  const timeInMillis = 30000;
  const granular = new Granular({
    audioContext,
    envelope: {
      attack: 0.1,
      decay: 0.5
    },
    density: 0.3,
    spread: 0.2,
    pitch: 1
  });

  const delay = new p5.Delay();

  delay.process(granular, 0.5, 0.5, 3000); // source, delayTime, feedback, filter frequency
  delay.drywet(0.1);

  const reverb = new p5.Reverb();
  reverb.drywet(0.2); 
  // due to a bug setting parameters will throw error
  // https://github.com/processing/p5.js/issues/3090
  reverb.process(delay, 3, 5); // source, reverbTime, decayRate in %, reverse

  reverb.amp(1);

  const compressor = new p5.Compressor();

  compressor.process(reverb, 0.005, 6, 10, -24, 0.05); // [attack], [knee], [ratio], [threshold], [release]

  granular.on('settingBuffer', () => console.log('setting buffer'));
  granular.on('bufferSet', () => console.log('buffer set'));
  granular.on('grainCreated', () => console.log('grain created'));

  const data = await getData('creed.mp3');

  await granular.setBuffer(data);

  const resume = document.getElementById('resume');

  resume.addEventListener('click', () => {
    const id = granular.startVoice({
      position: 0.0,
      gain: 0.5
    });

    let pitch = 1;
    let down = true;
    let t_0 = performance.now();

    const interval = setInterval(() => {
      if(down)
        pitch -= 0.15;
      else 
        pitch += 0.15;

      if (pitch < 0.5 ||  pitch > 1.0) down = !down;
      //console.log(pitch);
      granular.set({
        pitch
      });
      
      var t_1 = performance.now();
      var dt = t_1 - t_0;

      var pos = Math.clip(map (dt, 0, timeInMillis, 0.0, 1.0),0,1);
      // console.log(pos);
      granular.updateVoice(id, {
        position: pos
      });
    }, 15);

    setTimeout(() => {
      clearInterval(interval);

      granular.stopVoice(id);

      granular.set({
        pitch: 1
      });
    }, timeInMillis);
  }) // end resume listener
} // end init

init();

function map(value, inMin, inMax, outMin, outMax) {
  return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

Math.clip = function(number, min, max) {
  return Math.max(min, Math.min(number, max));
}