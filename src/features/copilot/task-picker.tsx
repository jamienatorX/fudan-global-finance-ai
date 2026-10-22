'use client';
import {TASK_CATALOG} from '../../agent/task-catalog';
import {blankTask,type DraftUpdate} from '../../agent/conversation-contracts';
export function TaskPicker({onPick,disabled}:{onPick:(task:DraftUpdate)=>void;disabled:boolean}){return <details className="mt-4 rounded-2xl border border-emerald-100 bg-white p-4"><summary className="cursor-pointer text-sm font-semibold">Choose a task</summary><div className="mt-3 flex flex-wrap gap-2">{TASK_CATALOG.map(t=><button type="button" disabled={disabled} key={t.name} onClick={()=>onPick({...blankTask(t.kind),currency:t.kind==='read'?'':'CNY',query:t.query??'',mode:t.mode??''})} className="rounded-xl border border-slate-200 min-h-11 px-3 py-2 text-sm hover:bg-emerald-50 disabled:opacity-50">{t.name}</button>)}</div></details>;}
