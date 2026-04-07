import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ecuRouter from "./ecu";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ecuRouter);

export default router;
