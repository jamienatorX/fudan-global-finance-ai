/** Linear continuous resampler. Retains the final source sample and fractional phase. */
export class PcmResampler{
 private pending=new Float32Array(0);private position=0;
 constructor(private readonly rate:number){if(!Number.isFinite(rate)||rate<16000)throw new Error('Unsupported microphone sample rate.');}
 push(chunk:Float32Array):Float32Array{
  const data=new Float32Array(this.pending.length+chunk.length);data.set(this.pending);data.set(chunk,this.pending.length);
  const result:number[]=[],step=this.rate/16000;
  while(this.position+1<data.length){const i=Math.floor(this.position),f=this.position-i;result.push(data[i]*(1-f)+data[i+1]*f);this.position+=step;}
  const consumed=Math.min(Math.floor(this.position),data.length);this.pending=data.slice(consumed);this.position-=consumed;return Float32Array.from(result);
 }
}
