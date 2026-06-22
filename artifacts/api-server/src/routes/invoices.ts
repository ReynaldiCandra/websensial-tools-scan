import { Router } from "express";
import { db, invoicesTable, prospectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateInvoiceBody,
  GetInvoiceParams,
  UpdateInvoiceParams,
  UpdateInvoiceBody,
  DeleteInvoiceParams,
} from "@workspace/api-zod";

type InvoiceItem = { description: string; qty: number; price: number; amount: number };

function formatInvoice(row: typeof invoicesTable.$inferSelect, prospectName?: string | null) {
  const items = (row.items as InvoiceItem[]) ?? [];
  return {
    ...row,
    prospectName: prospectName ?? null,
    items,
    subtotal: parseFloat(row.subtotal as string),
    discount: parseFloat(row.discount as string),
    total: parseFloat(row.total as string),
    createdAt: row.createdAt.toISOString(),
  };
}

function generateInvoiceNumber() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `INV-${yyyy}${mm}-${rand}`;
}

const router = Router();

router.get("/invoices", async (req, res) => {
  try {
    const rows = await db
      .select({
        invoice: invoicesTable,
        businessName: prospectsTable.businessName,
      })
      .from(invoicesTable)
      .leftJoin(prospectsTable, eq(invoicesTable.prospectId, prospectsTable.id))
      .orderBy(invoicesTable.createdAt);

    res.json(rows.map((r) => formatInvoice(r.invoice, r.businessName)));
  } catch (err) {
    req.log.error({ err }, "Failed to list invoices");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/invoices", async (req, res) => {
  try {
    const parsed = CreateInvoiceBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const { prospectId, items, discount, notes, dueDate, status } = parsed.data;
    const typedItems = (items ?? []) as InvoiceItem[];
    const subtotal = typedItems.reduce((s, i) => s + i.amount, 0);
    const disc = discount ?? 0;
    const total = subtotal - disc;

    const [row] = await db
      .insert(invoicesTable)
      .values({
        prospectId,
        invoiceNumber: generateInvoiceNumber(),
        items: typedItems,
        subtotal: subtotal.toString(),
        discount: disc.toString(),
        total: total.toString(),
        status: status ?? "draft",
        notes: notes ?? null,
        dueDate: dueDate ?? null,
      })
      .returning();

    const [prospect] = await db.select().from(prospectsTable).where(eq(prospectsTable.id, prospectId));
    res.status(201).json(formatInvoice(row, prospect?.businessName));
  } catch (err) {
    req.log.error({ err }, "Failed to create invoice");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/invoices/:id", async (req, res) => {
  try {
    const { id } = GetInvoiceParams.parse({ id: Number(req.params.id) });
    const [r] = await db
      .select({ invoice: invoicesTable, businessName: prospectsTable.businessName })
      .from(invoicesTable)
      .leftJoin(prospectsTable, eq(invoicesTable.prospectId, prospectsTable.id))
      .where(eq(invoicesTable.id, id));
    if (!r) return res.status(404).json({ error: "Invoice not found" });
    res.json(formatInvoice(r.invoice, r.businessName));
  } catch (err) {
    req.log.error({ err }, "Failed to get invoice");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/invoices/:id", async (req, res) => {
  try {
    const { id } = UpdateInvoiceParams.parse({ id: Number(req.params.id) });
    const parsed = UpdateInvoiceBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const { items, discount, notes, dueDate, status } = parsed.data;
    const update: Record<string, unknown> = {};
    if (items !== undefined) {
      const typedItems = items as InvoiceItem[];
      const subtotal = typedItems.reduce((s, i) => s + i.amount, 0);
      const disc = discount ?? 0;
      update.items = typedItems;
      update.subtotal = subtotal.toString();
      update.discount = disc.toString();
      update.total = (subtotal - disc).toString();
    } else if (discount !== undefined) {
      update.discount = discount.toString();
    }
    if (notes !== undefined) update.notes = notes;
    if (dueDate !== undefined) update.dueDate = dueDate;
    if (status !== undefined) update.status = status;

    const [row] = await db.update(invoicesTable).set(update).where(eq(invoicesTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Invoice not found" });
    const [prospect] = await db.select().from(prospectsTable).where(eq(prospectsTable.id, row.prospectId));
    res.json(formatInvoice(row, prospect?.businessName));
  } catch (err) {
    req.log.error({ err }, "Failed to update invoice");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/invoices/:id", async (req, res) => {
  try {
    const { id } = DeleteInvoiceParams.parse({ id: Number(req.params.id) });
    await db.delete(invoicesTable).where(eq(invoicesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete invoice");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
