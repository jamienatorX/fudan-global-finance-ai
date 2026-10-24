import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {VoiceInput} from '../../src/features/copilot/voice-input';
import {ConversationPanel} from '../../src/features/copilot/conversation-panel';
import {describeConversation} from '../../src/agent/conversation-controller';
import {newConversation} from '../../src/agent/conversation-contracts';
import {demoAgentContext} from '../../src/agent/context-adapters';
import {createSeedSnapshot} from '../../src/demo/seed';
vi.mock('next/navigation',()=>({useSearchParams:()=>new URLSearchParams()}));
const voice=vi.hoisted(()=>({prepare:vi.fn(),start:vi.fn(),dispose:vi.fn(),stop:vi.fn(),cancel:vi.fn(),record:vi.fn(),transcribe:vi.fn()}));
vi.mock('../../src/features/copilot/stream-runtime',()=>({prepareStream:voice.prepare}));
vi.mock('../../src/features/copilot/voice-runtime',()=>({recordVoice:voice.record,transcribeVoice:voice.transcribe}));
beforeEach(()=>{voice.prepare.mockResolvedValue({start:voice.start,dispose:voice.dispose});voice.start.mockResolvedValue({stop:voice.stop,cancel:voice.cancel});voice.stop.mockResolvedValue('Send 500元 to Evan');});
afterEach(()=>{cleanup();vi.useRealTimers();vi.resetAllMocks();});
async function start(){fireEvent.click(screen.getByRole('button',{name:'Dictate message'}));await screen.findByRole('button',{name:'Stop recording'});}
it('shows changing provisional words and inserts only the final text',async()=>{
 const onText=vi.fn();render(<VoiceInput disabled={false} onText={onText}/>);await start();
 const partial=voice.start.mock.calls[0][0];partial('Send 500');await screen.findByText('Send 500');partial('Send 500元 to Evan');await screen.findByText('Send 500元 to Evan');expect(onText).not.toHaveBeenCalled();expect(screen.getByText(/Provisional/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Stop recording'}));await waitFor(()=>expect(onText).toHaveBeenCalledExactlyOnceWith('Send 500元 to Evan'));expect(screen.queryByRole('combobox')).toBeNull();
});
it('allows cancellation while the model prepares and ignores late readiness',async()=>{
 let ready!:(engine:unknown)=>void;voice.prepare.mockImplementation(()=>new Promise(r=>{ready=r;}));render(<VoiceInput disabled={false} onText={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:'Dictate message'}));await screen.findByText(/Preparing live voice/);fireEvent.click(screen.getByRole('button',{name:'Cancel voice input'}));ready({start:voice.start,dispose:voice.dispose});await waitFor(()=>expect(voice.dispose).toHaveBeenCalled());expect(voice.start).not.toHaveBeenCalled();
});
it('shows denied microphone permission without inserting text',async()=>{
 voice.start.mockRejectedValue(new DOMException('denied','NotAllowedError'));const onText=vi.fn();render(<VoiceInput disabled={false} onText={onText}/>);fireEvent.click(screen.getByRole('button',{name:'Dictate message'}));expect(await screen.findByRole('alert')).toHaveTextContent('Microphone access was denied');expect(onText).not.toHaveBeenCalled();
});
it('releases microphone and warm engine on unmount',async()=>{
 const view=render(<VoiceInput disabled={false} onText={vi.fn()}/>);await start();view.unmount();expect(voice.cancel).toHaveBeenCalled();expect(voice.dispose).toHaveBeenCalled();
});
it('ignores a final result after cancellation and restart',async()=>{
 let finish!:(text:string)=>void;voice.stop.mockImplementationOnce(()=>new Promise(r=>{finish=r;}));const onText=vi.fn();render(<VoiceInput disabled={false} onText={onText}/>);await start();fireEvent.click(screen.getByRole('button',{name:'Stop recording'}));fireEvent.click(screen.getByRole('button',{name:'Cancel voice input'}));await start();finish('late result');await waitFor(()=>expect(screen.getByRole('button',{name:'Stop recording'})).toBeEnabled());expect(onText).not.toHaveBeenCalled();
});
it('offers standard dictation explicitly after streaming fails',async()=>{
 voice.prepare.mockRejectedValue(new Error('Download failed'));voice.record.mockResolvedValue({stop:vi.fn().mockResolvedValue(new Float32Array([.3])),cancel:vi.fn()});voice.transcribe.mockResolvedValue('你好');const onText=vi.fn();render(<VoiceInput disabled={false} onText={onText}/>);fireEvent.click(screen.getByRole('button',{name:'Dictate message'}));await screen.findByRole('alert');expect(voice.record).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Use standard dictation'}));await screen.findByRole('button',{name:'Stop recording'});fireEvent.click(screen.getByRole('button',{name:'Stop recording'}));await waitFor(()=>expect(onText).toHaveBeenCalledWith('你好'));
});
it('appends final speech to typed text and sends only after explicit Send',async()=>{
 const turn=describeConversation(newConversation('demo'),demoAgentContext(createSeedSnapshot('v1'),0)),request=vi.fn().mockResolvedValue(turn),decide=vi.fn();voice.stop.mockResolvedValue('再查看预算');render(<ConversationPanel source="voice test" transport={{request,prepare:vi.fn(),decide}}/>);await waitFor(()=>expect(screen.getByRole('button',{name:'Dictate message'})).toBeEnabled());fireEvent.change(screen.getByLabelText('Message Fufu'),{target:{value:'Check my balance'}});await start();expect(screen.getByRole('button',{name:'Send to Fufu'})).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'Stop recording'}));await waitFor(()=>expect(screen.getByLabelText('Message Fufu')).toHaveValue('Check my balance 再查看预算'));expect(request).toHaveBeenCalledTimes(1);expect(decide).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Send to Fufu'}));await waitFor(()=>expect(request).toHaveBeenCalledWith(expect.objectContaining({operation:'message',message:'Check my balance 再查看预算'})));
});
it('retains speech over the chat limit and asks for editing',async()=>{
 const turn=describeConversation(newConversation('demo'),demoAgentContext(createSeedSnapshot('v1'),0)),request=vi.fn().mockResolvedValue(turn),text='a'.repeat(1201);voice.stop.mockResolvedValue(text);render(<ConversationPanel source="long voice" transport={{request,prepare:vi.fn(),decide:vi.fn()}}/>);await waitFor(()=>expect(screen.getByRole('button',{name:'Dictate message'})).toBeEnabled());await start();fireEvent.click(screen.getByRole('button',{name:'Stop recording'}));await waitFor(()=>expect(screen.getByLabelText('Message Fufu')).toHaveValue(text));expect(screen.getByText(/Please shorten it to 1,000/)).toBeInTheDocument();expect(screen.getByRole('button',{name:'Send to Fufu'})).toBeDisabled();
});
it('rejects an empty final transcript without inserting a message',async()=>{
 voice.stop.mockResolvedValue(' ');const onText=vi.fn();render(<VoiceInput disabled={false} onText={onText}/>);await start();fireEvent.click(screen.getByRole('button',{name:'Stop recording'}));await screen.findByRole('alert');expect(onText).not.toHaveBeenCalled();
});
it('does not revive recording after an engine error during startup',async()=>{
 let finish!:(s:unknown)=>void;voice.start.mockImplementation((_partial,onError)=>{queueMicrotask(()=>onError(new Error('Device too slow')));return new Promise(r=>{finish=r;});});render(<VoiceInput disabled={false} onText={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:'Dictate message'}));await screen.findByRole('alert');finish({stop:voice.stop,cancel:voice.cancel});await waitFor(()=>expect(screen.getByRole('button',{name:'Dictate message'})).toBeEnabled());expect(screen.queryByRole('button',{name:'Stop recording'})).toBeNull();
});
it('keeps recording beyond thirty seconds and finalizes at two minutes',async()=>{
 render(<VoiceInput disabled={false} onText={vi.fn()}/>);await start();fireEvent.click(screen.getByRole('button',{name:'Cancel voice input'}));vi.useFakeTimers();fireEvent.click(screen.getByRole('button',{name:'Dictate message'}));await vi.advanceTimersByTimeAsync(31000);expect(voice.stop).not.toHaveBeenCalled();await vi.advanceTimersByTimeAsync(89000);expect(voice.stop).toHaveBeenCalledOnce();vi.useRealTimers();
});
it('returns to idle after page navigation and BFCache restoration',async()=>{
 render(<VoiceInput disabled={false} onText={vi.fn()}/>);await start();fireEvent(window,new Event('pagehide'));fireEvent(window,new Event('pageshow'));await waitFor(()=>expect(screen.getByRole('button',{name:'Dictate message'})).toBeEnabled());expect(screen.queryByRole('button',{name:'Stop recording'})).toBeNull();expect(voice.cancel).toHaveBeenCalled();
});
