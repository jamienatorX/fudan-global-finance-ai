begin;
create table public.bank_workflows (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.sim_profiles(user_id),
 plan_id uuid not null references public.sim_agent_plans(id), revision integer not null default 0,
 status text not null default 'active' check(status in ('active','paused','cancelled','completed','failed')),
 handoff boolean not null default false, created_at timestamptz not null default clock_timestamp(),
 unique(user_id,plan_id)
);
create table public.bank_workflow_nodes (
 id uuid primary key default gen_random_uuid(), workflow_id uuid not null references public.bank_workflows(id),
 user_id uuid not null references public.sim_profiles(user_id), position integer not null,
 payload jsonb not null, description text not null, dependencies integer[] not null default '{}',
 status text not null default 'waiting' check(status in ('waiting','pending','executed','rejected','failed','cancelled')),
 action_id uuid unique references public.sim_actions(id), recovery_id uuid unique references public.sim_actions(id),
 before_state jsonb, result jsonb, unique(workflow_id,position)
);
create index bank_workflows_plan on public.bank_workflows(plan_id);
create index bank_workflows_owner on public.bank_workflows(user_id,created_at);
create index bank_workflow_nodes_owner on public.bank_workflow_nodes(user_id,workflow_id);
alter table public.bank_workflows enable row level security;
alter table public.bank_workflow_nodes enable row level security;
create policy owner_read on public.bank_workflows for select to authenticated using(user_id=(select auth.uid()) and (select private.bank_session_valid()));
create policy owner_read on public.bank_workflow_nodes for select to authenticated using(user_id=(select auth.uid()) and (select private.bank_session_valid()));
revoke all on public.bank_workflows,public.bank_workflow_nodes from public,anon,authenticated;
grant select on public.bank_workflows,public.bank_workflow_nodes to authenticated;

create function public.bank_workflow_get(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.bank_workflows%rowtype;nodes jsonb;
begin
 perform private.bank_guard(false);
 select * into w from public.bank_workflows where id=p_id and user_id=auth.uid();
 if not found then raise exception 'WORKFLOW_NOT_FOUND';end if;
 select coalesce(jsonb_agg(to_jsonb(n) order by position),'[]') into nodes from public.bank_workflow_nodes n where workflow_id=w.id and user_id=auth.uid();
 return to_jsonb(w)||jsonb_build_object('nodes',nodes);
end $$;
create function public.bank_workflow_create(p_plan_id uuid,p_dependencies jsonb default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.sim_agent_plans%rowtype;rid uuid;v bigint;count_nodes integer;i integer;j integer;edge jsonb;deps integer[];edges integer:=0;
begin
 perform private.bank_guard(true);
 select version into v from public.sim_profiles where user_id=auth.uid() for update;
 select * into p from public.sim_agent_plans where id=p_plan_id and user_id=auth.uid();
 if not found then raise exception 'PLAN_NOT_FOUND';end if;
 select id into rid from public.bank_workflows where user_id=auth.uid() and plan_id=p.id;
 if rid is not null then return public.bank_workflow_get(rid);end if;
 if p.state_version<>v or p.expires_at<=clock_timestamp() then raise exception 'STALE_STATE';end if;
 count_nodes:=jsonb_array_length(p.plan->'actions');
 if count_nodes<1 or count_nodes>20 then raise exception 'INVALID_PLAN';end if;
 if p_dependencies is not null then
  if jsonb_typeof(p_dependencies)<>'array' or jsonb_array_length(p_dependencies)>40 then raise exception 'INVALID_DEPENDENCIES';end if;
  for edge in select value from jsonb_array_elements(p_dependencies) loop
   -- Require topological indexes: every prerequisite precedes its dependent.
   if jsonb_typeof(edge)<>'array' or jsonb_array_length(edge)<>2 or edge->>0 !~ '^[0-9]+$' or edge->>1 !~ '^[0-9]+$' then raise exception 'INVALID_DEPENDENCIES';end if;
   i:=(edge->>0)::integer;j:=(edge->>1)::integer;
   if i<0 or j>=count_nodes or i>=j then raise exception 'INVALID_DEPENDENCIES';end if;
  end loop;
 end if;
 insert into public.bank_workflows(user_id,plan_id) values(auth.uid(),p.id) returning id into rid;
 for i in 0..count_nodes-1 loop
  if p.plan->'actions'->i->'payload'->>'type' not in ('transfer','tuition','budget','subscription','card','investment')
   or p.plan->'actions'->i->'payload'->>'type' is null then raise exception 'ACTION_NOT_ALLOWED';end if;
  deps:='{}';
  if p_dependencies is null and i>0 then deps:=array[i-1];
  elsif p_dependencies is not null then
   for edge in select value from jsonb_array_elements(p_dependencies) loop if (edge->>1)::integer=i then deps:=array_append(deps,(edge->>0)::integer);end if;end loop;
  end if;
  edges:=edges+cardinality(deps);if edges>40 then raise exception 'INVALID_DEPENDENCIES';end if;
  insert into public.bank_workflow_nodes(workflow_id,user_id,position,payload,description,dependencies) values(rid,auth.uid(),i,p.plan->'actions'->i->'payload',left(coalesce(p.plan->'actions'->i->>'description',p.plan->'actions'->i->'payload'->>'type'),500),deps);
 end loop;
 insert into public.sim_audit(user_id,event,detail) values(auth.uid(),'workflow.created',jsonb_build_object('workflowId',rid,'nodes',count_nodes));
 return public.bank_workflow_get(rid);
end $$;

create or replace function private.bank_workflow_action_gate(p_action_id uuid) returns text language plpgsql stable security definer set search_path='' as $$
declare n public.bank_workflow_nodes%rowtype;w public.bank_workflows%rowtype;version bigint;
begin
 select * into n from public.bank_workflow_nodes where (action_id=p_action_id or recovery_id=p_action_id) and user_id=auth.uid();
 if not found then return null;end if;
 select * into w from public.bank_workflows where id=n.workflow_id and user_id=auth.uid();
 if w.handoff then return 'HUMAN_TAKEOVER_ACTIVE';end if;
 if n.recovery_id=p_action_id then
  select v.version into version from public.sim_profiles v where user_id=auth.uid();
  if exists(select 1 from public.sim_actions a where id=p_action_id and state_version<>version) then return 'MANUAL_REVIEW_REQUIRED';end if;
  return null;
 end if;
 if w.status<>'active' then return 'WORKFLOW_PAUSED';end if;
 if exists(select 1 from unnest(n.dependencies) dep where not exists(select 1 from public.bank_workflow_nodes prerequisite
 where prerequisite.workflow_id=w.id and prerequisite.position=dep and prerequisite.status='executed')) then return 'PREREQUISITE_INCOMPLETE';end if;
 return null;
end $$;

create function public.bank_workflow_command(p_id uuid,p_revision integer,p_command text,p_action_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.bank_workflows%rowtype;n public.bank_workflow_nodes%rowtype;prepared jsonb;outcome jsonb;prior jsonb;result jsonb;
begin
 perform private.bank_guard(true);
 perform 1 from public.sim_profiles where user_id=auth.uid() for update;
 select * into w from public.bank_workflows where id=p_id and user_id=auth.uid() for update;
 if not found then raise exception 'WORKFLOW_NOT_FOUND';end if;
 if w.revision<>p_revision then raise exception 'STALE_WORKFLOW';end if;
 if w.handoff then raise exception 'HUMAN_TAKEOVER_ACTIVE';end if;
 if p_command='pause' and w.status='active' then update public.bank_workflows set status='paused' where id=w.id;
 elsif p_command='resume' and w.status in ('paused','failed') then
  if exists(select 1 from public.bank_workflow_nodes node join public.sim_actions a on a.id=node.action_id
  where node.workflow_id=w.id and node.status='pending' and (a.state_version<>(select version from public.sim_profiles where user_id=auth.uid()) or a.expires_at<=clock_timestamp())) then raise exception 'STALE_STATE';end if;
  update public.bank_workflows set status='active' where id=w.id;
 elsif p_command='cancel_remaining' and w.status not in ('completed','cancelled') then
  update public.bank_workflow_nodes set status='cancelled' where workflow_id=w.id and status in ('waiting','pending','failed');
  update public.bank_workflows set status='cancelled' where id=w.id;
 elsif p_command='advance' and w.status='active' then
  select * into n from public.bank_workflow_nodes where workflow_id=w.id and status='pending' order by position limit 1;
  if not found then
   select * into n from public.bank_workflow_nodes node where workflow_id=w.id and status='waiting'
   and not exists(select 1 from unnest(node.dependencies) dep where not exists(select 1 from public.bank_workflow_nodes prerequisite where prerequisite.workflow_id=w.id and prerequisite.position=dep and prerequisite.status='executed')) order by position limit 1 for update;
   if not found then raise exception 'NO_READY_NODE';end if;
   if n.payload->>'type'='card' then select to_jsonb(c) into prior from public.sim_cards c where user_id=auth.uid() and id=(n.payload->>'cardId')::uuid;
   elsif n.payload->>'type'='budget' then select to_jsonb(b) into prior from public.sim_budgets b where user_id=auth.uid() and category=n.payload->>'category';end if;
   prepared:=private.sim_prepare(n.payload);
   update public.bank_workflow_nodes set action_id=(prepared->>'id')::uuid,status='pending',before_state=prior where id=n.id;
  else prepared:=jsonb_build_object('id',n.action_id);end if;
 elsif p_command in ('confirm','reject') and w.status='active' then
  select * into n from public.bank_workflow_nodes where workflow_id=w.id and action_id=p_action_id and status='pending' for update;
  if not found then raise exception 'NODE_NOT_PENDING';end if;
  outcome:=private.sim_execute(p_action_id,p_command='confirm');
  if outcome->>'status'='denied' then return public.bank_workflow_get(w.id)||jsonb_build_object('outcome',outcome,'actionId',p_action_id);end if;
  update public.bank_workflow_nodes set status=case when outcome->>'status'='executed' then 'executed' when outcome->>'status'='rejected' then 'rejected' else 'failed' end,result=outcome where id=n.id;
  if outcome->>'status'<>'executed' then update public.bank_workflows set status='failed' where id=w.id;
  elsif not exists(select 1 from public.bank_workflow_nodes where workflow_id=w.id and status<>'executed') then update public.bank_workflows set status='completed' where id=w.id;end if;
 else raise exception 'INVALID_WORKFLOW_COMMAND';end if;
 update public.bank_workflows set revision=revision+1 where id=w.id;
 insert into public.sim_audit(user_id,action_id,event,detail) values(auth.uid(),p_action_id,'workflow.'||p_command,jsonb_build_object('workflowId',w.id,'revision',w.revision+1));
 result:=public.bank_workflow_get(w.id);
 return result||jsonb_build_object('outcome',outcome,'actionId',coalesce(prepared->>'id',p_action_id::text));
end $$;

create function public.bank_workflow_recovery_prepare(p_id uuid,p_revision integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.bank_workflows%rowtype;n public.bank_workflow_nodes%rowtype;inverse jsonb;r jsonb;v bigint;
begin
 perform private.bank_guard(true);
 select version into v from public.sim_profiles where user_id=auth.uid() for update;
 select * into w from public.bank_workflows where id=p_id and user_id=auth.uid() for update;
 if not found then raise exception 'WORKFLOW_NOT_FOUND';end if;
 if w.revision<>p_revision then raise exception 'STALE_WORKFLOW';end if;
 if w.handoff then raise exception 'HUMAN_TAKEOVER_ACTIVE';end if;
 if w.status='active' then return jsonb_build_object('code','PAUSE_WORKFLOW_FIRST');end if;
 select node.* into n from public.bank_workflow_nodes node where workflow_id=w.id and status='executed'
 and not exists(select 1 from public.sim_actions a where a.id=node.recovery_id and a.status='executed') order by position desc limit 1;
 if not found then return jsonb_build_object('code','NO_RECOVERY_AVAILABLE');end if;
 if n.recovery_id is not null and exists(select 1 from public.sim_actions where id=n.recovery_id and status='pending' and state_version=v and expires_at>clock_timestamp()) then
 return (select jsonb_build_object('id',a.id,'payload',a.payload,'status','pending') from public.sim_actions a where id=n.recovery_id);end if;
 -- Only the latest state or a contiguous chain of this workflow's compensations may reverse.
 if v<>(n.result->>'version')::bigint and not exists(select 1 from public.bank_workflow_nodes node join public.sim_actions a on a.id=node.recovery_id
 where node.workflow_id=w.id and a.status='executed' and (a.result->>'version')::bigint=v) then return jsonb_build_object('code','MANUAL_REVIEW_REQUIRED');end if;
 if n.payload->>'type'='transfer' then inverse:=n.payload||jsonb_build_object('sourceId',n.payload->>'destinationId','destinationId',n.payload->>'sourceId');
 elsif n.payload->>'type'='budget' then inverse:=n.payload||jsonb_build_object('limitMinor',n.before_state->>'limit_minor');
 elsif n.payload->>'type'='card' and n.payload->>'mode'='limit' then inverse:=n.payload||jsonb_build_object('limitMinor',n.before_state->>'monthly_limit_minor');
 elsif n.payload->>'type'='card' then inverse:=n.payload||jsonb_build_object('mode',case when (n.before_state->>'frozen')::boolean then 'freeze' else 'unfreeze' end);
 else return jsonb_build_object('code','MANUAL_REVIEW_REQUIRED');end if;
 r:=private.sim_prepare(inverse);
 update public.bank_workflow_nodes set recovery_id=(r->>'id')::uuid where id=n.id;
 insert into public.sim_audit(user_id,action_id,event,detail) values(auth.uid(),(r->>'id')::uuid,'workflow.recovery.prepared',jsonb_build_object('workflowId',w.id,'originalActionId',n.action_id));
 return r;
end $$;
revoke all on function public.bank_workflow_get(uuid),public.bank_workflow_create(uuid,jsonb),public.bank_workflow_command(uuid,integer,text,uuid),public.bank_workflow_recovery_prepare(uuid,integer) from public,anon;
grant execute on function public.bank_workflow_get(uuid),public.bank_workflow_create(uuid,jsonb),public.bank_workflow_command(uuid,integer,text,uuid),public.bank_workflow_recovery_prepare(uuid,integer) to authenticated;

-- Keep the exposed API invoker-only; checked privileged helpers live privately.
do $wrappers$
declare fn record; args text; signature text; call_args text;
begin
 for fn in select p.oid,p.proname,p.proargnames from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace where ns.nspname='public' and p.proname=any(array['bank_workflow_get','bank_workflow_create','bank_workflow_command','bank_workflow_recovery_prepare']) loop
  args:=pg_get_function_arguments(fn.oid);signature:=pg_get_function_identity_arguments(fn.oid);call_args:=array_to_string(fn.proargnames,',');
  execute format('alter function public.%I(%s) set schema private',fn.proname,signature);
  execute format('create function public.%I(%s) returns jsonb language sql security invoker set search_path='''' as %L',fn.proname,args,'select private.'||quote_ident(fn.proname)||'('||coalesce(call_args,'')||');');
  execute format('revoke all on function private.%I(%s),public.%I(%s) from public,anon',fn.proname,signature,fn.proname,signature);
  execute format('grant execute on function private.%I(%s),public.%I(%s) to authenticated',fn.proname,signature,fn.proname,signature);
 end loop;
end $wrappers$;
commit;
