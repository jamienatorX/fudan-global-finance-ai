import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {VoiceInput} from '../../src/features/copilot/voice-input';
import {ConversationPanel} from '../../src/features/copilot/conversation-panel';
import {describeConversation} from '../../src/agent/conversation-controller';
import {newConversation} from '../../src/agent/conversation-contracts';
import {demoAgentContext} from '../../src/agent/context-adapters';
import {createSeedSnapshot} from '../../src/demo/seed';
vi.mock('next/navigation',()=>({useSearchParams:()=>new URLSearchParams()}));
const voice=vi.hoisted(()=>({record:vi.fn(),transcribe:vi.fn()}));
vi.mock('../../src/features/copilot/voice-runtime',()=>({recordVoice:voice.record,transcribeVoice:voice.transcribe}));
afterEach(()=>{cleanup();vi.resetAllMocks();});
it('dictates mixed language into an editable draft without sending anything',async()=>{
 const stop=vi.fn().mockResolvedValue(new Float32Array([.2,.3])),cancel=vi.fn(),onText=vi.fn();
 voice.record.mockResolvedValue({stop,cancel});voice.transcribe.mockResolvedValue('Send 500元 to Evan');
 render(<VoiceInput disabled={false} onText={onText}/>);
 fireEvent.click(screen.getByRole('button',{name:'Dictate message'}));
 await screen.findByRole('button',{name:'Stop recording'});expect(onText).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Stop recording'}));
 await waitFor(()=>expect(onText).toHaveBeenCalledWith('Send 500元 to Evan'));
 expect(screen.queryByRole('combobox')).toBeNull();expect(stop).toHaveBeenCalledOnce();
});
it('shows denied microphone permission and retains typed text',async()=>{
 voice.record.mockRejectedValue(new DOMException('denied','NotAllowedError'));const onText=vi.fn();
 render(<VoiceInput disabled={false} onText={onText}/>);fireEvent.click(screen.getByRole('button',{name:'Dictate message'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Microphone access was denied');expect(onText).not.toHaveBeenCalled();
});
it('cancels recording and releases the microphone on unmount',async()=>{
 const cancel=vi.fn();voice.record.mockResolvedValue({stop:vi.fn(),cancel});
 const view=render(<VoiceInput disabled={false} onText={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:'Dictate message'}));await screen.findByRole('button',{name:'Stop recording'});view.unmount();expect(cancel).toHaveBeenCalled();expect(voice.transcribe).not.toHaveBeenCalled();
});
it('does not insert late transcription after cancellation',async()=>{
 let finish!:(text:string)=>void;const onText=vi.fn();voice.record.mockResolvedValue({stop:vi.fn().mockResolvedValue(new Float32Array([.2])),cancel:vi.fn()});voice.transcribe.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 render(<VoiceInput disabled={false} onText={onText}/>);fireEvent.click(screen.getByRole('button',{name:'Dictate message'}));await screen.findByRole('button',{name:'Stop recording'});fireEvent.click(screen.getByRole('button',{name:'Stop recording'}));await waitFor(()=>expect(voice.transcribe).toHaveBeenCalled());fireEvent.click(screen.getByRole('button',{name:'Cancel voice input'}));finish('late result');await waitFor(()=>expect(screen.getByRole('button',{name:'Dictate message'})).toBeEnabled());expect(onText).not.toHaveBeenCalled();
});
it('appends speech to existing chat text and sends only after explicit Send',async()=>{
 const turn=describeConversation(newConversation('demo'),demoAgentContext(createSeedSnapshot('v1'),0)),request=vi.fn().mockResolvedValue(turn),decide=vi.fn();
 voice.record.mockResolvedValue({stop:vi.fn().mockResolvedValue(new Float32Array([.2])),cancel:vi.fn()});voice.transcribe.mockResolvedValue('再查看预算');
 render(<ConversationPanel source="voice test" transport={{request,prepare:vi.fn(),decide}}/>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Dictate message'})).toBeEnabled());fireEvent.change(screen.getByLabelText('Message Fufu'),{target:{value:'Check my balance'}});fireEvent.click(screen.getByRole('button',{name:'Dictate message'}));await screen.findByRole('button',{name:'Stop recording'});
 expect(screen.getByRole('button',{name:'Send to Fufu'})).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'Stop recording'}));
 await waitFor(()=>expect(screen.getByLabelText('Message Fufu')).toHaveValue('Check my balance 再查看预算'));expect(request).toHaveBeenCalledTimes(1);expect(decide).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Send to Fufu'}));await waitFor(()=>expect(request).toHaveBeenCalledWith(expect.objectContaining({operation:'message',message:'Check my balance 再查看预算'})));
});
