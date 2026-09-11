import { Router } from "express";
import controller from "../controllers/list.controller.js";
import { authenticate } from "../authorization/authorization.js";

const router = Router();

router.get("/", [authenticate], controller.findAll);
router.post("/", [authenticate], controller.create);
router.put("/:listId", [authenticate], controller.update);
router.delete("/:listId", [authenticate], controller.delete);

export default router;
