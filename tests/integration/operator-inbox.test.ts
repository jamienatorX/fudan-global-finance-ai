// @vitest-environment node
import {afterEach,expect,it} from 'vitest';
import type {PGlite} from '@electric-sql/pglite';
import {A,B,asUser,createDatabase} from './database';
let db:PGlite;afterEach(async()=>{await db?.close();});
async function rpc(name:string,args:unknown[]=[]){return (await db.query<Record<string,Record<string,unknown>>>(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')})`,args)).rows[0][name];}
it('persists tickets, restricts role/assignment and revokes operator authority',async()=>{
 db=await createDatabase();await asUser(db,A);await rpc('sim_initialize');
 const ticket=await rpc('bank_support_create',[null,{workflow:false,security:false},'Please help me review my transfer']);expect(ticket.status).toBe('queued');
 expect((await rpc('bank_support_get',[ticket.id])).messages).toHaveLength(1);
 await asUser(db,B);await expect(rpc('bank_support_get',[ticket.id])).rejects.toThrow('TICKET_NOT_FOUND');
 await expect(rpc('bank_operator_command',[ticket.id,0,'claim',''])).rejects.toThrow('OPERATOR_REQUIRED');
 await expect(db.query('insert into private.bank_operators(user_id) values($1)',[B])).rejects.toThrow(/permission denied/);
 await db.exec('reset role');await db.query('insert into private.bank_operators(user_id) values($1)',[B]);await asUser(db,B);
 const claimed=await rpc('bank_operator_command',[ticket.id,0,'claim','']);expect(claimed.status).toBe('assigned');
 const replied=await rpc('bank_operator_command',[ticket.id,claimed.revision,'reply','I can help you review the plan.']);
 await db.exec('reset role');await db.query('update private.bank_operators set active=false where user_id=$1',[B]);await asUser(db,B);
 await expect(rpc('bank_support_get',[ticket.id])).rejects.toThrow('TICKET_NOT_FOUND');
 await expect(rpc('bank_operator_command',[ticket.id,replied.revision,'release',''])).rejects.toThrow('OPERATOR_REQUIRED');
 await asUser(db,A);expect((await rpc('bank_support_get',[ticket.id])).messages).toHaveLength(2);
});
