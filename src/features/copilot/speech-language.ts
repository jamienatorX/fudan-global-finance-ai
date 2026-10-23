export function detectedSpeechLanguage(scores:ArrayLike<number|bigint>,languages:Record<string,number>):string{
 let best=-Infinity,language='';
 for(const [token,id] of Object.entries(languages)){const score=Number(scores[id]);if(Number.isFinite(score)&&score>best&&/^<\|[a-z]{2,3}\|>$/.test(token)){best=score;language=token.slice(2,-2);}}
 if(!language)throw new Error('Unable to identify the spoken language. Please try again.');return language;
}
