export type StreamRequest={type:'prepare';baseUrl:string;model:ArrayBuffer}|{type:'start'|'finish'|'cancel';session:number}|{type:'audio';session:number;pcm:Float32Array};
export type StreamResponse={type:'ready'}|{type:'partial'|'final';session:number;text:string}|{type:'ack';session:number;samples:number}|{type:'error';session?:number;message:string};
