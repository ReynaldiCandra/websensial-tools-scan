import { Router } from "express";
import { db, prospectsTable, activitiesTable } from "@workspace/db";
import { eq, count, sql, desc } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (req, res) => {
  try {
    const [totalRow] = await db.select({ count: count() }).from(prospectsTable);
    const [dealRow] = await db
      .select({ count: count() })
      .from(prospectsTable)
      .where(sql`status IN ('deal','invoice','selesai')`);

    const revenueRow = await db
      .select({ total: sql<string>`COALESCE(SUM(deal_value::numeric), 0)` })
      .from(prospectsTable)
      .where(sql`status IN ('deal','invoice','selesai')`);

    const thisMonthProspects = await db
      .select({ count: count() })
      .from(prospectsTable)
      .where(sql`created_at >= date_trunc('month', now())`);

    const thisMonthDeals = await db
      .select({ count: count() })
      .from(prospectsTable)
      .where(sql`status IN ('deal','invoice','selesai') AND created_at >= date_trunc('month', now())`);

    const total = totalRow?.count ?? 0;
    const deals = dealRow?.count ?? 0;

    res.json({
      totalProspects: Number(total),
      totalDeals: Number(deals),
      totalRevenue: parseFloat(revenueRow[0]?.total ?? "0"),
      conversionRate: total > 0 ? Math.round((Number(deals) / Number(total)) * 100) : 0,
      thisMonthProspects: Number(thisMonthProspects[0]?.count ?? 0),
      thisMonthDeals: Number(thisMonthDeals[0]?.count ?? 0),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/pipeline", async (req, res) => {
  try {
    const rows = await db
      .select({ status: prospectsTable.status, count: count() })
      .from(prospectsTable)
      .groupBy(prospectsTable.status);

    const map: Record<string, number> = {};
    for (const r of rows) map[r.status] = Number(r.count);

    res.json({
      belumDihubungi: map["belum_dihubungi"] ?? 0,
      dihubungi: map["dihubungi"] ?? 0,
      demo: map["demo"] ?? 0,
      deal: map["deal"] ?? 0,
      invoice: map["invoice"] ?? 0,
      selesai: map["selesai"] ?? 0,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get pipeline");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/recent-activity", async (req, res) => {
  try {
    const rows = await db
      .select({
        id: activitiesTable.id,
        prospectId: activitiesTable.prospectId,
        type: activitiesTable.type,
        notes: activitiesTable.notes,
        createdAt: activitiesTable.createdAt,
        businessName: prospectsTable.businessName,
        prospectName: prospectsTable.ownerName,
      })
      .from(activitiesTable)
      .innerJoin(prospectsTable, eq(activitiesTable.prospectId, prospectsTable.id))
      .orderBy(desc(activitiesTable.createdAt))
      .limit(20);

    res.json(
      rows.map((r) => ({
        ...r,
        prospectName: r.prospectName ?? r.businessName,
        createdAt: r.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get recent activity");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
