import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import prospectsRouter from "./prospects";
import activitiesRouter from "./activities";
import templatesRouter from "./templates";
import invoicesRouter from "./invoices";
import packagesRouter from "./packages";
import prospectingRouter from "./prospecting";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(prospectsRouter);
router.use(activitiesRouter);
router.use(templatesRouter);
router.use(invoicesRouter);
router.use(packagesRouter);
router.use(prospectingRouter);

export default router;
