export class Transcript{
 private complete:string[]=[];
 update(partial:string){return [...this.complete,partial.trim()].filter(Boolean).join(' ');}
 endpoint(text:string){if(text.trim())this.complete.push(text.trim());}
}
