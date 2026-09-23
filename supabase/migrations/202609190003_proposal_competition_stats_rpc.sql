-- Pro-tier "Rekabet / başvuru içgörüleri" (competition insights).
--
-- RLS deliberately only lets a freelancer see their OWN proposal rows,
-- so a normal client-side query can never compute "how many other
-- proposals were sent for this project". This security-definer RPC
-- exposes ONLY aggregate numbers (counts/averages) for projects the
-- calling freelancer has themselves proposed to — it never returns
-- other freelancers' identities, cover letters, or contact info.
create or replace function public.my_proposal_competition_stats()
returns table(
  project_id uuid,
  proposal_id uuid,
  total_proposals bigint,
  avg_bid_amount numeric,
  my_bid_amount numeric,
  cheaper_than_me bigint
)
language sql
stable security definer
set search_path = public
as $$
  select
    p.project_id,
    p.id as proposal_id,
    counts.total_proposals,
    counts.avg_bid_amount,
    p.bid_amount as my_bid_amount,
    (
      select count(*) from proposals p2
      where p2.project_id = p.project_id and p2.bid_amount < p.bid_amount
    ) as cheaper_than_me
  from proposals p
  join (
    select project_id, count(*) as total_proposals, avg(bid_amount) as avg_bid_amount
    from proposals
    group by project_id
  ) counts on counts.project_id = p.project_id
  where p.freelancer_id = auth.uid();
$$;

grant execute on function public.my_proposal_competition_stats() to authenticated;
