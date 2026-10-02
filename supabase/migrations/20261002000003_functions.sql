-- ============================================================================
-- RPC functions that members call. They run with elevated rights but check
-- membership themselves, so the rules live in one place.
-- ============================================================================

-- RSVP to an event, or cancel. Returns 'going', 'cancelled', 'full' or 'closed'.
-- The event row is locked, so two members can't take the last seat at the same time.
create function public.rsvp_event(p_event_id uuid, p_going boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_event public.events;
  v_taken integer;
begin
  if not public.is_member() then
    raise exception 'Only approved members can RSVP.' using errcode = '42501';
  end if;

  select * into v_event from public.events where id = p_event_id and published for update;
  if not found then
    raise exception 'Event not found.' using errcode = 'P0002';
  end if;

  if not p_going then
    update public.event_attendees set status = 'cancelled'
      where event_id = p_event_id and member_id = v_uid;
    return 'cancelled';
  end if;

  if v_event.starts_at <= now() or (v_event.rsvp_deadline is not null and v_event.rsvp_deadline < now()) then
    return 'closed';
  end if;

  if exists (select 1 from public.event_attendees where event_id = p_event_id and member_id = v_uid and status = 'going') then
    return 'going';
  end if;

  if v_event.capacity is not null then
    select count(*) into v_taken from public.event_attendees where event_id = p_event_id and status = 'going';
    if v_taken >= v_event.capacity then
      return 'full';
    end if;
  end if;

  insert into public.event_attendees (event_id, member_id, status, payment_status)
  values (
    p_event_id, v_uid, 'going',
    case when coalesce(v_event.fee_amount, 0) > 0 then 'unpaid'::public.payment_status end
  )
  on conflict (event_id, member_id) do update
    set status = 'going',
        payment_status = coalesce(public.event_attendees.payment_status, excluded.payment_status);
  return 'going';
end $$;

-- A member says "I've paid" for their membership fee. An admin then confirms it.
create function public.report_membership_payment(p_payment_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.membership_payments
    set status = 'reported', reported_at = now()
    where id = p_payment_id and member_id = auth.uid() and status = 'unpaid';
end $$;

-- A member says "I've paid" for an event fee.
create function public.report_event_payment(p_event_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.event_attendees
    set payment_status = 'reported', payment_reported_at = now()
    where event_id = p_event_id and member_id = auth.uid() and payment_status = 'unpaid';
end $$;

-- Number of members going, per event (members can't read other members' RSVP rows).
create function public.event_going_counts(p_event_ids uuid[])
returns table (event_id uuid, going integer)
language sql stable security definer set search_path = '' as $$
  select a.event_id, count(*)::integer
  from public.event_attendees a
  join public.events e on e.id = a.event_id
  where a.event_id = any (p_event_ids)
    and a.status = 'going'
    and (public.is_admin() or (public.is_member() and e.published))
  group by a.event_id;
$$;

-- Display names of the members going to an event, so members can see who else is coming.
create function public.event_attendee_names(p_event_id uuid)
returns table (display_name text)
language sql stable security definer set search_path = '' as $$
  select p.display_name
  from public.event_attendees a
  join public.events e on e.id = a.event_id
  join public.profiles p on p.id = a.member_id
  where a.event_id = p_event_id
    and a.status = 'going'
    and (public.is_admin() or (public.is_member() and e.published))
  order by a.created_at;
$$;

-- Only signed-in users may call these. Helpers stay callable by the RLS policies.
revoke execute on function
  public.rsvp_event(uuid, boolean),
  public.report_membership_payment(uuid),
  public.report_event_payment(uuid),
  public.event_going_counts(uuid[]),
  public.event_attendee_names(uuid)
from public, anon;
grant execute on function
  public.rsvp_event(uuid, boolean),
  public.report_membership_payment(uuid),
  public.report_event_payment(uuid),
  public.event_going_counts(uuid[]),
  public.event_attendee_names(uuid)
to authenticated;

revoke execute on function public.handle_new_user(), public.handle_user_email_change() from public, anon, authenticated;
