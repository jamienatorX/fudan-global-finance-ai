// Microphone PCM only. Audio is forwarded to the local recognition worker, never a server.
class FufuPcm extends AudioWorkletProcessor {
 constructor(){super();this.samples=[];this.port.onmessage=e=>{if(e.data==='flush'){this.flush();this.port.postMessage({flushed:true});}};}
 flush(){if(this.samples.length){const pcm=Float32Array.from(this.samples);this.samples=[];this.port.postMessage({pcm},[pcm.buffer]);}}
 process(inputs){const channels=inputs[0];if(channels?.length){for(let i=0;i<channels[0].length;i++){let sample=0;for(const channel of channels)sample+=channel[i]/channels.length;this.samples.push(sample);}if(this.samples.length>=sampleRate/10)this.flush();}return true;}
}
registerProcessor('fufu-pcm',FufuPcm);
