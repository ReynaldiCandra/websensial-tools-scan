import { Router } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateSettingsBody } from "@workspace/api-zod";

const router = Router();

function formatSettings(row: typeof settingsTable.$inferSelect) {
  return {
    ...row,
    updatedAt: row.updatedAt.toISOString(),
  };
}

// Settings is a singleton: always row id=1. Create it on first read if missing.
async function getOrCreateSettings() {
  const [existing] = await db.select().from(settingsTable).where(eq(settingsTable.id, 1));
  if (existing) return existing;

  const [created] = await db
    .insert(settingsTable)
    .values({ id: 1 })
    .onConflictDoNothing()
    .returning();

  if (created) return created;

  // Race condition fallback: someone else created it between select and insert
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.id, 1));
  return row;
}

router.get("/settings", async (req, res) => {
  try {
    const row = await getOrCreateSettings();
    return res.json(formatSettings(row));
  } catch (err) {
    req.log.error({ err }, "Failed to get settings");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/settings", async (req, res) => {
  try {
    const parsed = UpdateSettingsBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    await getOrCreateSettings();

    const [row] = await db
      .update(settingsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(settingsTable.id, 1))
      .returning();

    return res.json(formatSettings(row));
  } catch (err) {
    req.log.error({ err }, "Failed to update settings");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
