import { Router } from "express";
import controller from "../controllers/user.controller.js";
import { authenticate } from "../authorization/authorization.js";

const router = Router();

router.get("/:id", [authenticate], controller.findOne);
router.put("/:id", [authenticate], controller.update);

export default router;
