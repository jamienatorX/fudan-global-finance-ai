import type {SimClient} from './secure-banking';
/** Ordered owner-scoped data. Never use a service-role client for this surface. */
export async function readScenarioState(client:SimClient){
 const tables=['bank_demo_beneficiaries','bank_reservations','bank_scheduled_jobs','bank_split_requests','bank_renewal_notices','bank_action_evidence'] as const;
 const results=await Promise.all(tables.map(t=>client.from(t).select('*').order(t==='bank_demo_beneficiaries'?'name':t==='bank_split_requests'?'position':t==='bank_action_evidence'?'recorded_at':'created_at',{ascending:t==='bank_demo_beneficiaries'||t==='bank_split_requests'}).limit(100)));
 for(const r of results)if(r.error)throw new Error('SERVICE_UNAVAILABLE');
 const scheduler=await client.rpc('bank_scheduler_status');if(scheduler.error)throw new Error('SERVICE_UNAVAILABLE');
 return {...Object.fromEntries(tables.map((t,i)=>[t,results[i].data??[]])),bank_scheduler_status:[scheduler.data]};
}
