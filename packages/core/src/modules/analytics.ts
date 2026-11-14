import { sql } from "drizzle-orm";
import { db } from "@ep/db";
import { authorize, type Actor } from "../context";

const num = (v: unknown) => Number(v ?? 0);

/**
 * National integrity & coverage dashboard. All aggregates are pushed to Postgres.
 * Production: served from materialised views refreshed by a worker (and cached in Redis),
 * never computed on the OLTP primary per request.
 */
export async function nationalOverview(actor: Actor) {
  authorize(actor, "analytics", "read");
  const [totals] = await db.execute(sql`
    select
      (select count(*) from people) citizens,
      (select count(*) from households) households,
      (select count(*) from programs where active) programs,
      (select count(*) from enrollments where status = 'active') active_enrollments,
      (select coalesce(sum(p.amount),0) from enrollments e join programs p on p.id = e.program_id where e.status = 'active') monthly_outlay,
      (select count(*) from fraud_flags where status = 'open') open_flags,
      (select coalesce(sum(p.amount),0) from fraud_flags f
         join enrollments e on e.id = f.enrollment_id join programs p on p.id = e.program_id
         where f.severity = 'high' and f.status <> 'dismissed') monthly_leakage_blocked,
      (select count(*) from grievances where status <> 'resolved') open_grievances,
      (select coalesce(sum(amount),0) from disbursements where status = 'paid') total_paid`);

  // Targeting accuracy: poorest 40% vs richest 20% by per-capita income (proxy-means).
  const [targeting] = await db.execute(sql`
    with pc as (
      select pe.nid,
        s.monthly_income::float / greatest(1, (select count(*) from people p2 where p2.household_id = pe.household_id)) per_capita,
        exists (select 1 from enrollments e where e.nid = pe.nid and e.status = 'active') benefits
      from people pe join person_signals s on s.nid = pe.nid where not pe.is_deceased),
    ranked as (select *, ntile(5) over (order by per_capita) q from pc)
    select
      round(100.0 * count(*) filter (where q <= 2 and not benefits) / nullif(count(*) filter (where q <= 2), 0)) poor_excluded_pct,
      round(100.0 * count(*) filter (where q = 5 and benefits) / nullif(count(*) filter (where q = 5), 0)) rich_included_pct
    from ranked`);

  const flagsByType = await db.execute<{ type: string; n: number }>(sql`
    select type, count(*)::int n from fraud_flags where status = 'open' group by type order by n desc`);

  const cards = await db.execute<{ status: string; n: number }>(sql`
    select status, count(*)::int n from legacy_cards group by status`);

  const byDivision = await db.execute<{ division: string; enrolled: number; flagged: number }>(sql`
    select pe.division_code division,
      count(distinct e.id) filter (where e.status = 'active')::int enrolled,
      count(distinct f.id) filter (where f.status = 'open')::int flagged
    from people pe
    left join enrollments e on e.nid = pe.nid
    left join fraud_flags f on f.nid = pe.nid
    group by pe.division_code order by enrolled desc`);

  const byProvider = await db.execute<{ provider: string; paid: number; count: number }>(sql`
    select provider, coalesce(sum(amount),0)::bigint paid, count(*)::int count
    from disbursements where status = 'paid' group by provider order by paid desc`);

  const t = totals ?? {};
  return {
    citizens: num(t.citizens),
    households: num(t.households),
    programs: num(t.programs),
    activeEnrollments: num(t.active_enrollments),
    monthlyOutlay: num(t.monthly_outlay),
    openFlags: num(t.open_flags),
    monthlyLeakageBlocked: num(t.monthly_leakage_blocked),
    openGrievances: num(t.open_grievances),
    totalPaid: num(t.total_paid),
    poorExcludedPct: num(targeting?.poor_excluded_pct),
    richIncludedPct: num(targeting?.rich_included_pct),
    flagsByType: flagsByType.map((r) => ({ type: r.type, n: num(r.n) })),
    cards: Object.fromEntries(cards.map((r) => [r.status, num(r.n)])) as Record<string, number>,
    byDivision: byDivision.map((r) => ({ division: r.division, enrolled: num(r.enrolled), flagged: num(r.flagged) })),
    byProvider: byProvider.map((r) => ({ provider: r.provider, paid: num(r.paid), count: num(r.count) })),
  };
}

export type NationalOverview = Awaited<ReturnType<typeof nationalOverview>>;

/** Public, anonymous transparency numbers for the landing page. */
export async function publicStats() {
  const [r] = await db.execute(sql`
    select (select count(*) from people) citizens,
           (select count(*) from programs where active) programs,
           (select count(*) from enrollments where status = 'active') beneficiaries,
           (select count(*) from legacy_cards where status in ('unmatched','duplicate')) ghost_cards`);
  return { citizens: num(r?.citizens), programs: num(r?.programs), beneficiaries: num(r?.beneficiaries), ghostCards: num(r?.ghost_cards) };
}
