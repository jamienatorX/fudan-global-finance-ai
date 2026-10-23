import {env,pipeline,Tensor} from '@huggingface/transformers';
import {detectedSpeechLanguage} from './speech-language';
env.allowLocalModels=false;
env.backends.onnx.wasm!.numThreads=1;
// A multilingual model, with no forced language or translation to English.
self.onmessage=async({data}:{data:{audio:Float32Array}})=>{
 try{
  self.postMessage({type:'progress',text:'Preparing voice recognition… The first download may take a few minutes.'});
  const transcriber=await pipeline('automatic-speech-recognition','onnx-community/whisper-base',{device:'wasm',dtype:'q8',progress_callback:progress=>{
   if(progress.status==='progress_total')self.postMessage({type:'progress',text:`Downloading voice recognition… ${Math.floor(progress.progress)}%`});
  }});
  self.postMessage({type:'progress',text:'Transcribing…'});
  // Transformers.js currently defaults an omitted Whisper language to English.
  // Predict the language token from the audio before transcription instead.
  const config=transcriber.model.generation_config as {lang_to_id?:Record<string,number>;decoder_start_token_id?:number};
  if(!config.lang_to_id||!config.decoder_start_token_id)throw new Error('Language detection unavailable');
  const features=await transcriber.processor(data.audio);
  const detection=await transcriber.model({...features,decoder_input_ids:new Tensor('int64',[BigInt(config.decoder_start_token_id)],[1,1])});
  const language=detectedSpeechLanguage(detection.logits.data,config.lang_to_id);
  const output=await transcriber(data.audio,{language,task:'transcribe',chunk_length_s:30,stride_length_s:5});
  const text=(Array.isArray(output)?output.map(x=>x.text).join(' '):output.text).trim();
  self.postMessage({type:'result',text});await transcriber.dispose();
 }catch{self.postMessage({type:'error'});}
};
