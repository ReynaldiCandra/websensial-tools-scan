import { Router } from "express";
import { db, packagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreatePackageBody,
  UpdatePackageParams,
  UpdatePackageBody,
  DeletePackageParams,
} from "@workspace/api-zod";

const router = Router();

function formatPackage(row: typeof packagesTable.$inferSelect) {
  return {
    ...row,
    price: parseFloat(row.price as string),
    features: (row.features as string[]) ?? [],
    createdAt: row.createdAt.toISOString(),
  };
}

router.get("/packages", async (req, res) => {
  try {
    const rows = await db.select().from(packagesTable).orderBy(packagesTable.price);
    res.json(rows.map(formatPackage));
  } catch (err) {
    req.log.error({ err }, "Failed to list packages");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/packages", async (req, res) => {
  try {
    const parsed = CreatePackageBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const { price, features, ...rest } = parsed.data;
    const [row] = await db
      .insert(packagesTable)
      .values({ ...rest, price: price.toString(), features: features ?? [] })
      .returning();
    res.status(201).json(formatPackage(row));
  } catch (err) {
    req.log.error({ err }, "Failed to create package");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/packages/:id", async (req, res) => {
  try {
    const { id } = UpdatePackageParams.parse({ id: Number(req.params.id) });
    const parsed = UpdatePackageBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const { price, features, ...rest } = parsed.data;
    const update: Record<string, unknown> = { ...rest };
    if (price !== undefined) update.price = price.toString();
    if (features !== undefined) update.features = features;
    const [row] = await db.update(packagesTable).set(update).where(eq(packagesTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Package not found" });
    res.json(formatPackage(row));
  } catch (err) {
    req.log.error({ err }, "Failed to update package");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/packages/:id", async (req, res) => {
  try {
    const { id } = DeletePackageParams.parse({ id: Number(req.params.id) });
    await db.delete(packagesTable).where(eq(packagesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete package");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
