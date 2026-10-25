begin;
create table private.bank_operators (
 user_id uuid primary key references auth.users(id), active boolean not null default true,
 granted_at timestamptz not null default clock_timestamp()
);
alter table private.bank_operators enable row level security;
revoke all on private.bank_operators from public,anon,authenticated;
create table public.bank_support_tickets (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 workflow_id uuid references public.bank_workflows(id), consent jsonb not null,
 status text not null default 'queued' check(status in ('queued','assigned','released','resolved')),
 operator_id uuid references auth.users(id), claim_expires_at timestamptz, revision integer not null default 0,
 created_at timestamptz not null default clock_timestamp()
);
create index bank_support_owner on public.bank_support_tickets(user_id,created_at);
create index bank_support_queue on public.bank_support_tickets(status,created_at);
create index bank_support_operator on public.bank_support_tickets(operator_id,claim_expires_at);
create unique index bank_support_active_workflow on public.bank_support_tickets(workflow_id) where status in ('queued','assigned');
create table public.bank_support_messages (
 id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.bank_support_tickets(id),
 user_id uuid not null references auth.users(id), sender_id uuid not null references auth.users(id), sender_role text not null check(sender_role in ('customer','operator')),
 message text not null check(length(message) between 1 and 2000), created_at timestamptz not null default clock_timestamp()
);
create index bank_support_messages_owner on public.bank_support_messages(user_id,ticket_id);
create index bank_support_tickets_workflow on public.bank_support_tickets(workflow_id);
create index bank_support_messages_ticket on public.bank_support_messages(ticket_id,created_at);
create function private.bank_operator_active() returns boolean language sql stable security definer set search_path='' as $$
 select private.bank_session_valid() and exists(select 1 from private.bank_operators where user_id=auth.uid() and active);
$$;
alter table public.bank_support_tickets enable row level security;
alter table public.bank_support_messages enable row level security;
create policy ticket_read on public.bank_support_tickets for select to authenticated using(
 (user_id=(select auth.uid()) and (select private.bank_session_valid())) or
 (operator_id=(select auth.uid()) and claim_expires_at>clock_timestamp() and (select private.bank_operator_active())));
create policy message_read on public.bank_support_messages for select to authenticated using(exists(select 1 from public.bank_support_tickets t where t.id=ticket_id));
revoke all on public.bank_support_tickets,public.bank_support_messages from public,anon,authenticated;
grant select on public.bank_support_tickets,public.bank_support_messages to authenticated;

create function public.bank_support_get(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.bank_support_tickets%rowtype;msgs jsonb;ctx jsonb:='{}';
begin
 perform private.bank_guard(false);
 select * into t from public.bank_support_tickets where id=p_id and (user_id=auth.uid() or
 (operator_id=auth.uid() and claim_expires_at>clock_timestamp() and private.bank_operator_active()));
 if not found then raise exception 'TICKET_NOT_FOUND';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'role',m.sender_role,'message',m.message,'createdAt',m.created_at) order by m.created_at,m.id),'[]') into msgs from public.bank_support_messages m where ticket_id=t.id;
 if t.consent->>'workflow'='true' and t.workflow_id is not null then
  select jsonb_build_object('status',w.status,'revision',w.revision,'nodes',(select coalesce(jsonb_agg(jsonb_build_object('position',n.position,'type',n.payload->>'type','status',n.status)),'[]') from public.bank_workflow_nodes n where n.workflow_id=w.id)) into ctx from public.bank_workflows w where w.id=t.workflow_id and w.user_id=t.user_id;
 end if;
 if t.consent->>'security'='true' then ctx:=ctx||jsonb_build_object('security',(select jsonb_build_object('reason',reason,'expiresAt',expires_at,'reviewed',reviewed_at is not null) from private.bank_safety_locks where user_id=t.user_id));end if;
 return to_jsonb(t)||jsonb_build_object('messages',msgs,'context',ctx);
end $$;
create function public.bank_support_list(p_operator boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform private.bank_guard(false);
 if p_operator then
  if not private.bank_operator_active() then raise exception 'OPERATOR_REQUIRED';end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'status',status,'revision',revision,'createdAt',created_at,'assignedToMe',operator_id=auth.uid()) order by created_at),'[]') into result
  from (select * from public.bank_support_tickets where status='queued' or (status='assigned' and (operator_id=auth.uid() or claim_expires_at<=clock_timestamp())) order by created_at limit 100) t;
 else
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'status',status,'revision',revision,'createdAt',created_at) order by created_at desc),'[]') into result
  from (select * from public.bank_support_tickets where user_id=auth.uid() order by created_at desc limit 100) t;
 end if;
 return jsonb_build_object('tickets',result);
end $$;
create function public.bank_support_create(p_workflow_id uuid,p_consent jsonb,p_message text) returns jsonb language plpgsql security definer set search_path='' as $$
declare rid uuid;n integer;
begin
 -- Support remains available while mutations are safety-locked.
 perform private.bank_guard(false);
 if length(btrim(p_message)) not between 1 and 2000 then raise exception 'INVALID_MESSAGE';end if;
 perform 1 from public.sim_profiles where user_id=auth.uid() for update;
 if not found then raise exception 'ENROLLMENT_REQUIRED';end if;
 select count(*) into n from public.bank_support_tickets where user_id=auth.uid() and status in ('queued','assigned');
 if n>=5 then raise exception 'SUPPORT_LIMIT';end if;
 if p_workflow_id is not null then
  update public.bank_workflows set handoff=true,status=case when status='active' then 'paused' else status end,revision=revision+1 where id=p_workflow_id and user_id=auth.uid();
  if not found then raise exception 'WORKFLOW_NOT_FOUND';end if;
 end if;
 insert into public.bank_support_tickets(user_id,workflow_id,consent)
 values(auth.uid(),p_workflow_id,jsonb_build_object('workflow',coalesce(p_consent->>'workflow'='true',false),'security',coalesce(p_consent->>'security'='true',false))) returning id into rid;
 insert into public.bank_support_messages(ticket_id,user_id,sender_id,sender_role,message) values(rid,auth.uid(),auth.uid(),'customer',btrim(p_message));
 insert into public.bank_security_events(user_id,session_id,category) values(auth.uid(),nullif(auth.jwt()->>'session_id','')::uuid,'SUPPORT_CREATED');
 return public.bank_support_get(rid);
end $$;
create function public.bank_support_reply(p_id uuid,p_revision integer,p_message text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform private.bank_guard(false);
 if length(btrim(p_message)) not between 1 and 2000 then raise exception 'INVALID_MESSAGE';end if;
 update public.bank_support_tickets set revision=revision+1 where id=p_id and user_id=auth.uid() and revision=p_revision and status in ('queued','assigned');
 if not found then raise exception 'STALE_TICKET';end if;
 insert into public.bank_support_messages(ticket_id,user_id,sender_id,sender_role,message) values(p_id,auth.uid(),auth.uid(),'customer',btrim(p_message));
 return public.bank_support_get(p_id);
end $$;
create function public.bank_operator_command(p_id uuid,p_revision integer,p_command text,p_message text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.bank_support_tickets%rowtype;
begin
 perform private.bank_guard(false);
 if not private.bank_operator_active() or not private.bank_recent_mfa() then raise exception 'OPERATOR_REQUIRED';end if;
 select * into t from public.bank_support_tickets where id=p_id for update;
 if not found then raise exception 'TICKET_NOT_FOUND';end if;
 if t.revision<>p_revision then raise exception 'STALE_TICKET';end if;
 if p_command='claim' then
  if t.status not in ('queued','assigned') or (t.status='assigned' and t.claim_expires_at>clock_timestamp() and t.operator_id<>auth.uid()) then raise exception 'TICKET_ALREADY_ASSIGNED';end if;
  update public.bank_support_tickets set status='assigned',operator_id=auth.uid(),claim_expires_at=clock_timestamp()+interval '30 minutes',revision=revision+1 where id=t.id;
 else
  if t.status<>'assigned' or t.operator_id is distinct from auth.uid() or t.claim_expires_at<=clock_timestamp() then raise exception 'ASSIGNMENT_REQUIRED';end if;
  if p_command in ('reply','propose') then
   if length(btrim(p_message)) not between 1 and 2000 then raise exception 'INVALID_MESSAGE';end if;
   insert into public.bank_support_messages(ticket_id,user_id,sender_id,sender_role,message) values(t.id,t.user_id,auth.uid(),'operator',btrim(p_message));
   update public.bank_support_tickets set revision=revision+1 where id=t.id;
  elsif p_command in ('release','resolve') then
   update public.bank_support_tickets set status=case when p_command='release' then 'released' else 'resolved' end,revision=revision+1 where id=t.id;
   update public.bank_workflows set handoff=false,revision=revision+1 where id=t.workflow_id and user_id=t.user_id;
  elsif p_command='review_unlock' and t.consent->>'security'='true' then
   update private.bank_safety_locks set reviewed_at=clock_timestamp() where user_id=t.user_id;
   update public.bank_support_tickets set revision=revision+1 where id=t.id;
  else raise exception 'INVALID_OPERATOR_COMMAND';end if;
 end if;
 insert into public.bank_security_events(user_id,session_id,category) values(t.user_id,nullif(auth.jwt()->>'session_id','')::uuid,'OPERATOR_'||upper(p_command));
 return public.bank_support_get(t.id);
end $$;
create function public.bank_security_recover() returns jsonb language plpgsql security definer set search_path='' as $$
declare r private.bank_safety_locks%rowtype;
begin
 perform private.bank_guard(false);
 select * into r from private.bank_safety_locks where user_id=auth.uid() for update;
 if not found then return jsonb_build_object('status','unlocked');end if;
 if not private.bank_recent_mfa() or private.bank_totp_time()<=extract(epoch from r.created_at) then return jsonb_build_object('code','FRESH_CHALLENGE_REQUIRED');end if;
 if r.recovery_required and r.reviewed_at is null then return jsonb_build_object('code','OPERATOR_REVIEW_REQUIRED');end if;
 delete from private.bank_safety_locks where user_id=auth.uid();
 insert into public.bank_security_events(user_id,session_id,category) values(auth.uid(),nullif(auth.jwt()->>'session_id','')::uuid,'OWNER_RECOVERY_VERIFIED');
 return jsonb_build_object('status','unlocked');
end $$;
revoke all on function private.bank_operator_active(),public.bank_support_get(uuid),public.bank_support_list(boolean),public.bank_support_create(uuid,jsonb,text),public.bank_support_reply(uuid,integer,text),public.bank_operator_command(uuid,integer,text,text),public.bank_security_recover() from public,anon;
grant execute on function private.bank_operator_active(),public.bank_support_get(uuid),public.bank_support_list(boolean),public.bank_support_create(uuid,jsonb,text),public.bank_support_reply(uuid,integer,text),public.bank_operator_command(uuid,integer,text,text),public.bank_security_recover() to authenticated;

-- Keep the exposed API invoker-only; checked privileged helpers live privately.
do $wrappers$
declare fn record; args text; signature text; call_args text;
begin
 for fn in select p.oid,p.proname,p.proargnames from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace where ns.nspname='public' and p.proname=any(array['bank_support_get','bank_support_list','bank_support_create','bank_support_reply','bank_operator_command','bank_security_recover']) loop
  args:=pg_get_function_arguments(fn.oid);signature:=pg_get_function_identity_arguments(fn.oid);call_args:=array_to_string(fn.proargnames,',');
  execute format('alter function public.%I(%s) set schema private',fn.proname,signature);
  execute format('create function public.%I(%s) returns jsonb language sql security invoker set search_path='''' as %L',fn.proname,args,'select private.'||quote_ident(fn.proname)||'('||coalesce(call_args,'')||');');
  execute format('revoke all on function private.%I(%s),public.%I(%s) from public,anon',fn.proname,signature,fn.proname,signature);
  execute format('grant execute on function private.%I(%s),public.%I(%s) to authenticated',fn.proname,signature,fn.proname,signature);
 end loop;
end $wrappers$;
commit;
