import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
// Opt in with synthetic WAV fixtures; model download makes this unsuitable for every CI run.
const fixtureDir=process.env.FUFU_SPEECH_FIXTURE_DIR;
test('streams bilingual speech locally and preserves the editable draft',async({page})=>{
 test.skip(!fixtureDir,'Set FUFU_SPEECH_FIXTURE_DIR to the documented synthetic WAV fixtures.');test.setTimeout(360000);
 await page.addInitScript(()=>{
  const w=window as unknown as {fixture:string;mode:string;voiceContext:AudioContext;tracks:MediaStreamTrack[]};w.tracks=[];
  navigator.mediaDevices.getUserMedia=async()=>{const ac=new AudioContext();await ac.resume();const buffer=await ac.decodeAudioData(Uint8Array.from(atob(w.fixture),c=>c.charCodeAt(0)).buffer),source=ac.createBufferSource(),destination=ac.createMediaStreamDestination();if(w.mode==='silence'||w.mode==='repeat'){const duration=w.mode==='silence'?7:buffer.duration*2+3.5,target=ac.createBuffer(1,Math.ceil(duration*buffer.sampleRate),buffer.sampleRate);if(w.mode==='repeat'){target.copyToChannel(buffer.getChannelData(0),0,0);target.copyToChannel(buffer.getChannelData(0),0,Math.floor((buffer.duration+3.5)*buffer.sampleRate));}source.buffer=target;}else source.buffer=buffer;source.connect(destination);source.start();w.voiceContext=ac;w.tracks.push(...destination.stream.getTracks());return destination.stream;};
 });
 const bankingRequests:string[]=[];page.on('request',r=>{if(r.method()!=='GET'&&!(r.url().endsWith('/api/agent/demo-conversation')&&r.postDataJSON()?.operation==='load'))bankingRequests.push(r.url());});
 await page.route('**/api/agent/demo-conversation',r=>r.fulfill({json:{state:{id:'voice-acceptance',revision:0,drafts:[],messages:[]},tasks:[],entities:{accounts:[],beneficiaries:[],subscriptions:[],cards:[],products:[]}}}));
 await page.goto('/');
 for(const [lang,pattern] of [['en',/CHECK MY BALANCE/i],['zh',/这个月的预算/],['mixed',/订阅/],['long',/DOLLARS TOMORROW/i],['silence',/^Typed draft$/],['repeat',/CHECK MY BALANCE AND SHOW MY BUDGET.*CHECK MY BALANCE AND SHOW MY BUDGET/i]] as const){
  const audio=(await readFile(path.join(fixtureDir!,`fufu-voice-${lang==='silence'||lang==='repeat'?'en':lang}.wav`))).toString('base64');await page.evaluate(({audio,lang})=>{const w=window as unknown as {fixture:string;mode:string};w.fixture=audio;w.mode=lang;},{audio,lang});await page.getByLabel('Message Fufu').fill('Typed draft');await page.getByRole('button',{name:'Dictate message',exact:true}).click();await page.getByRole('button',{name:'Stop recording',exact:true}).waitFor({timeout:240000});if(lang!=='silence')await expect(page.getByText('Provisional · review after Stop')).toBeVisible({timeout:12000});await page.waitForTimeout(lang==='long'?43000:lang==='repeat'?12000:7000);await expect(page.getByLabel('Message Fufu')).toHaveValue('Typed draft');await page.getByRole('button',{name:'Stop recording',exact:true}).click();if(lang==='silence')await expect(page.locator('p[role=alert]')).toContainText('did not catch',{timeout:35000});await expect(page.getByLabel('Message Fufu')).toHaveValue(pattern,{timeout:35000});if(lang!=='silence')expect(await page.getByLabel('Message Fufu').inputValue()).toMatch(/^Typed draft /);if(lang==='repeat')expect((await page.getByLabel('Message Fufu').inputValue()).match(/CHECK MY BALANCE/g)).toHaveLength(2);expect(await page.evaluate(()=>(window as unknown as {tracks:MediaStreamTrack[]}).tracks.every(t=>t.readyState==='ended'))).toBe(true);await page.evaluate(()=>(window as unknown as {voiceContext:AudioContext}).voiceContext.close());
 }
 expect(bankingRequests).toEqual([]);
});
