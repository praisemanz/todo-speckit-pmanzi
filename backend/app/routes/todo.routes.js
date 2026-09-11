import { Router } from "express";
import controller from "../controllers/todo.controller.js";
import { authenticate } from "../authorization/authorization.js";

const router = Router();

router.put("/:id", [authenticate], controller.update);
router.delete("/:id", [authenticate], controller.delete);

export default router;
