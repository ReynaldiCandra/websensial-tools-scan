import { Router } from "express";
import { db, activitiesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { ListActivitiesParams, CreateActivityParams, CreateActivityBody } from "@workspace/api-zod";

const router = Router();

router.get("/prospects/:id/activities", async (req, res) => {
  try {
    const { id } = ListActivitiesParams.parse({ id: Number(req.params.id) });
    const rows = await db
      .select()
      .from(activitiesTable)
      .where(eq(activitiesTable.prospectId, id))
      .orderBy(desc(activitiesTable.createdAt));
    res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to list activities");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/prospects/:id/activities", async (req, res) => {
  try {
    const { id } = CreateActivityParams.parse({ id: Number(req.params.id) });
    const parsed = CreateActivityBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const [row] = await db
      .insert(activitiesTable)
      .values({ prospectId: id, type: parsed.data.type, notes: parsed.data.notes ?? null })
      .returning();

    res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create activity");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
