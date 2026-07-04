import { Router } from "express";
import { db, prospectsTable } from "@workspace/db";
import { eq, ilike, and, sql } from "drizzle-orm";
import {
  ListProspectsQueryParams,
  CreateProspectBody,
  UpdateProspectBody,
  GetProspectParams,
  UpdateProspectParams,
  DeleteProspectParams,
  UpdateProspectStatusParams,
  UpdateProspectStatusBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/prospects", async (req, res) => {
  try {
    const parsed = ListProspectsQueryParams.safeParse(req.query);
    const query = parsed.success ? parsed.data : {};
    const conditions = [];

    if (query.status) conditions.push(eq(prospectsTable.status, query.status));
    if (query.category) conditions.push(eq(prospectsTable.category, query.category));
    if (query.search) {
      conditions.push(
        sql`(${prospectsTable.businessName} ILIKE ${"%" + query.search + "%"} OR ${prospectsTable.phone} ILIKE ${"%" + query.search + "%"})`
      );
    }

    const rows = await db
      .select()
      .from(prospectsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`created_at DESC`);

    return res.json(
      rows.map((r) => ({
        ...r,
        rating: r.rating !== null ? parseFloat(r.rating) : null,
        dealValue: r.dealValue !== null ? parseFloat(r.dealValue) : null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list prospects");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/prospects", async (req, res) => {
  try {
    const parsed = CreateProspectBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const data = parsed.data;
    const [row] = await db
      .insert(prospectsTable)
      .values({
        businessName: data.businessName,
        ownerName: data.ownerName ?? null,
        phone: data.phone,
        address: data.address ?? null,
        category: data.category,
        source: data.source ?? "manual",
        hasWebsite: data.hasWebsite ?? false,
        currentWebsite: data.currentWebsite ?? null,
        status: data.status ?? "belum_dihubungi",
        notes: data.notes ?? null,
        rating: data.rating?.toString() ?? null,
        mapsUrl: data.mapsUrl ?? null,
        dealValue: data.dealValue?.toString() ?? null,
      })
      .returning();

    return res.status(201).json({
      ...row,
      rating: row.rating !== null ? parseFloat(row.rating) : null,
      dealValue: row.dealValue !== null ? parseFloat(row.dealValue) : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create prospect");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/prospects/:id", async (req, res) => {
  try {
    const { id } = GetProspectParams.parse({ id: Number(req.params.id) });
    const [row] = await db.select().from(prospectsTable).where(eq(prospectsTable.id, id));
    if (!row) return res.status(404).json({ error: "Prospect not found" });
    return res.json({
      ...row,
      rating: row.rating !== null ? parseFloat(row.rating) : null,
      dealValue: row.dealValue !== null ? parseFloat(row.dealValue) : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get prospect");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/prospects/:id", async (req, res) => {
  try {
    const { id } = UpdateProspectParams.parse({ id: Number(req.params.id) });
    const parsed = UpdateProspectBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const data = parsed.data;
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (data.businessName !== undefined) update.businessName = data.businessName;
    if (data.ownerName !== undefined) update.ownerName = data.ownerName;
    if (data.phone !== undefined) update.phone = data.phone;
    if (data.address !== undefined) update.address = data.address;
    if (data.category !== undefined) update.category = data.category;
    if (data.source !== undefined) update.source = data.source;
    if (data.hasWebsite !== undefined) update.hasWebsite = data.hasWebsite;
    if (data.currentWebsite !== undefined) update.currentWebsite = data.currentWebsite;
    if (data.status !== undefined) update.status = data.status;
    if (data.notes !== undefined) update.notes = data.notes;
    if (data.rating !== undefined) update.rating = data.rating?.toString() ?? null;
    if (data.mapsUrl !== undefined) update.mapsUrl = data.mapsUrl;
    if (data.dealValue !== undefined) update.dealValue = data.dealValue?.toString() ?? null;

    const [row] = await db.update(prospectsTable).set(update).where(eq(prospectsTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Prospect not found" });
    return res.json({
      ...row,
      rating: row.rating !== null ? parseFloat(row.rating) : null,
      dealValue: row.dealValue !== null ? parseFloat(row.dealValue) : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update prospect");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/prospects/:id", async (req, res) => {
  try {
    const { id } = DeleteProspectParams.parse({ id: Number(req.params.id) });
    await db.delete(prospectsTable).where(eq(prospectsTable.id, id));
    return res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete prospect");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/prospects/:id/status", async (req, res) => {
  try {
    const { id } = UpdateProspectStatusParams.parse({ id: Number(req.params.id) });
    const parsed = UpdateProspectStatusBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const [row] = await db
      .update(prospectsTable)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(eq(prospectsTable.id, id))
      .returning();
    if (!row) return res.status(404).json({ error: "Prospect not found" });
    return res.json({
      ...row,
      rating: row.rating !== null ? parseFloat(row.rating) : null,
      dealValue: row.dealValue !== null ? parseFloat(row.dealValue) : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update status");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
