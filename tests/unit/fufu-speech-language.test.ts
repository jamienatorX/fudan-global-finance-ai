import {expect,it} from 'vitest';
import {detectedSpeechLanguage} from '../../src/features/copilot/speech-language';
it('detects Mandarin from model language-token scores, ignoring non-language tokens',()=>{expect(detectedSpeechLanguage(new Float32Array([100,2,8,1]),{'<|en|>':1,'<|zh|>':2,'<|fr|>':3})).toBe('zh');});
it('detects English without consulting the page language',()=>{expect(detectedSpeechLanguage(new Float32Array([0,8,2]),{'<|en|>':1,'<|zh|>':2})).toBe('en');});
it('rejects invalid detection output instead of silently forcing English',()=>{expect(()=>detectedSpeechLanguage(new Float32Array([NaN]),{'<|en|>':0})).toThrow();});
