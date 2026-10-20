import { Router, type IRouter } from "express";
import { requireApiKey } from "../middlewares/api-key";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import prospectsRouter from "./prospects";
import activitiesRouter from "./activities";
import templatesRouter from "./templates";
import invoicesRouter from "./invoices";
import packagesRouter from "./packages";
import settingsRouter from "./settings";
import prospectingRouter from "./prospecting";
import previewsRouter, { publicPreviewsRouter } from "./previews";

const router: IRouter = Router();

router.use(healthRouter);
// Login/logout/session are public by design: the cookie they issue is what
// gates everything below.
router.use(authRouter);
// Prospect demo share link (`/api/preview/:token`) stays public — it is the
// link business owners open from WhatsApp.
router.use(publicPreviewsRouter);
// Every route below (dashboard, prospects, invoices, templates, prospecting,
// previews, …) is internal CRM data — gate it all behind the API key.
router.use(requireApiKey);
router.use(dashboardRouter);
router.use(prospectsRouter);
router.use(activitiesRouter);
router.use(templatesRouter);
router.use(invoicesRouter);
router.use(packagesRouter);
router.use(settingsRouter);
router.use(prospectingRouter);
router.use(previewsRouter);

export default router;
