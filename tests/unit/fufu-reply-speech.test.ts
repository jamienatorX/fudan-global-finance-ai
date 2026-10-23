import {expect,it} from 'vitest';
import {replySpeechParts} from '../../src/features/copilot/reply-speech';
it('keeps decimal amounts intact at a playback chunk boundary',()=>{const text='余'.repeat(176)+'12345.67元';const parts=replySpeechParts(text);expect(parts.map(p=>p.text).join('')).toBe(text);expect(parts.some(p=>p.text.includes('12345.67'))).toBe(true);});
