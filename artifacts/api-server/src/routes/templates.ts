import { Router } from "express";
import { db, templatesTable, prospectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateTemplateBody,
  UpdateTemplateParams,
  UpdateTemplateBody,
  DeleteTemplateParams,
  RenderTemplateParams,
  RenderTemplateBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/templates", async (req, res) => {
  try {
    const rows = await db.select().from(templatesTable).orderBy(templatesTable.createdAt);
    return res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to list templates");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/templates", async (req, res) => {
  try {
    const parsed = CreateTemplateBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const [row] = await db.insert(templatesTable).values(parsed.data).returning();
    return res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create template");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/templates/:id", async (req, res) => {
  try {
    const { id } = UpdateTemplateParams.parse({ id: Number(req.params.id) });
    const parsed = UpdateTemplateBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const [row] = await db.update(templatesTable).set(parsed.data).where(eq(templatesTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Template not found" });
    return res.json({ ...row, createdAt: row.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update template");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/templates/:id", async (req, res) => {
  try {
    const { id } = DeleteTemplateParams.parse({ id: Number(req.params.id) });
    await db.delete(templatesTable).where(eq(templatesTable.id, id));
    return res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete template");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/templates/:id/render", async (req, res) => {
  try {
    const { id } = RenderTemplateParams.parse({ id: Number(req.params.id) });
    const parsed = RenderTemplateBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const [template] = await db.select().from(templatesTable).where(eq(templatesTable.id, id));
    if (!template) return res.status(404).json({ error: "Template not found" });

    const [prospect] = await db.select().from(prospectsTable).where(eq(prospectsTable.id, parsed.data.prospectId));
    if (!prospect) return res.status(404).json({ error: "Prospect not found" });

    let message = template.content
      .replace(/\{\{businessName\}\}/g, prospect.businessName)
      .replace(/\{\{ownerName\}\}/g, prospect.ownerName ?? "Bapak/Ibu")
      .replace(/\{\{category\}\}/g, prospect.category);

    const cleanPhone = prospect.phone.replace(/^0/, "62").replace(/\D/g, "");
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    return res.json({ message, waUrl });
  } catch (err) {
    req.log.error({ err }, "Failed to render template");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
