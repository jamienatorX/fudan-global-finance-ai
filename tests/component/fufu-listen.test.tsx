import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {ReplyListen} from '../../src/features/copilot/reply-listen';
const speak=vi.fn(),cancel=vi.fn();
class Utterance {text:string;lang='';voice=null;onend:(()=>void)|null=null;onerror:((event:{error:string})=>void)|null=null;constructor(text:string){this.text=text;}}
function setup(){vi.stubGlobal('SpeechSynthesisUtterance',Utterance);vi.stubGlobal('speechSynthesis',{speak,cancel,getVoices:()=>[]});}
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.clearAllMocks();});
it('speaks only after Listen and can stop without any chat operation',()=>{setup();render(<ReplyListen text="Your balance is CNY 500.00."/>);expect(speak).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Listen to Fufu reply'}));expect(speak).toHaveBeenCalledOnce();expect(speak.mock.calls[0][0].text).toBe('Your balance is CNY 500.00.');fireEvent.click(screen.getByRole('button',{name:'Stop reading reply'}));expect(cancel).toHaveBeenCalled();});
it('stops an older reply when another reply starts and selects Chinese automatically',()=>{setup();render(<><ReplyListen text="Your balance is 500."/><ReplyListen text="你的余额是500元。"/></>);const buttons=screen.getAllByRole('button',{name:'Listen to Fufu reply'});fireEvent.click(buttons[0]);fireEvent.click(buttons[1]);expect(screen.getAllByRole('button',{name:'Stop reading reply'})).toHaveLength(1);expect(speak.mock.calls.at(-1)![0].lang).toBe('zh-CN');});
it('shows a clear fallback when speech synthesis is unavailable',()=>{vi.stubGlobal('speechSynthesis',undefined);render(<ReplyListen text="Hello"/>);fireEvent.click(screen.getByRole('button',{name:'Listen to Fufu reply'}));expect(screen.getByRole('status')).toHaveTextContent('unavailable');});
it('cancels playback on unmount',()=>{setup();const view=render(<ReplyListen text="Hello"/>);fireEvent.click(screen.getByRole('button',{name:'Listen to Fufu reply'}));cancel.mockClear();view.unmount();expect(cancel).toHaveBeenCalledOnce();});
