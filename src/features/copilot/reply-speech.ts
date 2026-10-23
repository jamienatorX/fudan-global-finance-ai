let activeStop:(()=>void)|undefined;
export function stopReplySpeech(){activeStop?.();}

// Bound utterance length without splitting decimal amounts or dropping text.
export function replySpeechParts(text:string):{text:string;lang:string}[]{
 const parts:{text:string;lang:string}[]=[];let remaining=text.trim();
 while(remaining){let end=Math.min(180,remaining.length);if(end<remaining.length){const boundary=remaining.lastIndexOf(' ',end);if(boundary>80)end=boundary;while(end<remaining.length&&/[\d.,]/.test(remaining[end-1])&&/[\d.,]/.test(remaining[end]))end++;}
  const part=remaining.slice(0,end);parts.push({text:part,lang:/[\u3400-\u9fff]/.test(part)?'zh-CN':'en-US'});remaining=remaining.slice(end).trimStart();
 }return parts;
}

export function playReplySpeech(text:string,onDone:()=>void,onError:(message:string)=>void):()=>void{
 if(typeof speechSynthesis==='undefined'||typeof SpeechSynthesisUtterance==='undefined'){onError('Read aloud is unavailable in this browser. You can still read the reply.');return()=>{};}
 stopReplySpeech();const synth=speechSynthesis,parts=replySpeechParts(text);let stopped=false,index=0,utterance:SpeechSynthesisUtterance|null=null;
 const stop=()=>{if(stopped)return;stopped=true;if(utterance){utterance.onend=null;utterance.onerror=null;}if(activeStop===stop){activeStop=undefined;synth.cancel();}onDone();};
 activeStop=stop;
 function next(){
  if(stopped)return;if(index>=parts.length){stopped=true;if(activeStop===stop)activeStop=undefined;onDone();return;}
  const part=parts[index++];utterance=new SpeechSynthesisUtterance(part.text);utterance.lang=part.lang;
  const voices=synth.getVoices().filter(v=>v.lang.toLowerCase().startsWith(part.lang.slice(0,2)));
  const voice=voices.find(v=>v.localService&&v.lang.toLowerCase()===part.lang.toLowerCase())??voices.find(v=>v.localService)??voices[0];if(voice)utterance.voice=voice;
  utterance.onend=next;utterance.onerror=e=>{if(stopped)return;stop();if(e.error!=='canceled'&&e.error!=='interrupted')onError('This reply could not be read aloud. Check that a suitable voice is available on your device.');};
  try{synth.speak(utterance);}catch{stop();onError('Read aloud is unavailable. Please try again.');}
 }
 next();return stop;
}
