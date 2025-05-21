import express from "express";
import { generateCourse, saveCourse } from "../controllers/aiController.js";
import { isAuth } from "../middlewares/isAuth.js";

const router = express.Router();

router.post("/generate-course", isAuth, generateCourse);
router.post("/save-course", isAuth, saveCourse);

export default router;