begin;
grant usage on schema private to anon;
create table private.fufu_demo_access (id boolean primary key default true check(id),secret_hash text not null check(length(secret_hash)=64));
create table private.fufu_demo_sessions (token_hash text primary key check(length(token_hash)=64),state jsonb not null,revision integer not null,expires_at timestamptz not null);
create index fufu_demo_sessions_expiry on private.fufu_demo_sessions(expires_at);
create table private.fufu_demo_quota (scope text not null,bucket text not null,calls integer not null,primary key(scope,bucket));
alter table private.fufu_demo_access enable row level security;
alter table private.fufu_demo_sessions enable row level security;
alter table private.fufu_demo_quota enable row level security;
revoke all on private.fufu_demo_access,private.fufu_demo_sessions,private.fufu_demo_quota from public,anon,authenticated;
create function private.fufu_demo_conversation(p_secret text,p_operation text,p_token_hash text,p_state jsonb,p_revision integer,p_create boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r private.fufu_demo_sessions; access_hash text; v_now timestamptz:=clock_timestamp(); scope_id text; bucket_id text; cap integer; calls_now integer;
begin
 if p_secret is null or length(p_secret)<>64 then raise exception 'INVALID_SESSION';end if;
 -- One lock serializes admission across every Vercel instance and protects the global free quota.
 select secret_hash into access_hash from private.fufu_demo_access where id=true for update;
 if access_hash is null or access_hash<>encode(sha256(convert_to(p_secret,'UTF8')),'hex') then raise exception 'INVALID_SESSION';end if;
 if p_token_hash is null or p_token_hash!~'^[a-f0-9]{64}$' then raise exception 'INVALID_SESSION';end if;
 if p_operation='open' and p_create then
  delete from private.fufu_demo_sessions where expires_at<v_now;
  delete from private.fufu_demo_quota where bucket<to_char(v_now-interval '2 days','YYYY-MM-DD');
  if (select count(*) from private.fufu_demo_sessions)>=100 then raise exception 'RATE_LIMITED';end if;
  if p_state is null or p_state->>'source' is distinct from 'demo' or (p_state->>'revision')::integer<>0 or jsonb_array_length(p_state->'drafts')<>0 or jsonb_array_length(p_state->'messages')<>0 then raise exception 'INVALID_SESSION';end if;
  p_state:=jsonb_set(p_state,'{expiresAt}',to_jsonb(floor(extract(epoch from v_now+interval '30 minutes')*1000)::bigint));
  insert into private.fufu_demo_sessions values(p_token_hash,p_state,0,v_now+interval '30 minutes');return p_state;
 end if;
 select * into r from private.fufu_demo_sessions where token_hash=p_token_hash for update;
 if not found or r.expires_at<v_now then raise exception 'CONVERSATION_EXPIRED';end if;
 if p_operation='open' then return r.state;end if;
 if p_operation='reserve' then
  for scope_id,bucket_id,cap in select p_token_hash,to_char(v_now at time zone 'UTC','YYYY-MM-DD HH24:MI'),10 union all select p_token_hash,to_char(v_now at time zone 'UTC','YYYY-MM-DD'),50 union all select 'global',to_char(v_now at time zone 'UTC','YYYY-MM-DD'),40 loop
   insert into private.fufu_demo_quota values(scope_id,bucket_id,1) on conflict(scope,bucket) do update set calls=private.fufu_demo_quota.calls+1 returning calls into calls_now;
   if calls_now>cap then raise exception 'RATE_LIMITED';end if;
  end loop;return r.state;
 end if;
 if p_operation='save' then
  if p_revision is distinct from r.revision then raise exception 'STALE_CONVERSATION';end if;
  if p_state is null or p_state->>'source' is distinct from 'demo' or p_state->>'id' is distinct from r.state->>'id' or (p_state->>'revision')::integer is distinct from r.revision+1 or octet_length(p_state::text)>100000 or jsonb_array_length(p_state->'messages')>40 or jsonb_array_length(p_state->'drafts')>20 then raise exception 'INVALID_SESSION';end if;
  p_state:=jsonb_set(p_state,'{expiresAt}',to_jsonb(floor(extract(epoch from v_now+interval '30 minutes')*1000)::bigint));
  update private.fufu_demo_sessions set state=p_state,revision=r.revision+1,expires_at=v_now+interval '30 minutes' where token_hash=p_token_hash;return p_state;
 end if;
 raise exception 'INVALID_SESSION';
end;
$$;
revoke all on function private.fufu_demo_conversation(text,text,text,jsonb,integer,boolean) from public;
grant execute on function private.fufu_demo_conversation(text,text,text,jsonb,integer,boolean) to anon,authenticated;
create function public.fufu_demo_conversation(p_secret text,p_operation text,p_token_hash text,p_state jsonb,p_revision integer,p_create boolean) returns jsonb language sql security invoker set search_path='' as $$select private.fufu_demo_conversation(p_secret,p_operation,p_token_hash,p_state,p_revision,p_create);$$;
revoke all on function public.fufu_demo_conversation(text,text,text,jsonb,integer,boolean) from public;
grant execute on function public.fufu_demo_conversation(text,text,text,jsonb,integer,boolean) to anon,authenticated;
commit;
