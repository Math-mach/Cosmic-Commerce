import { Router } from "express";

const UserController = require("../controller/UserController");
const AuthMiddleware = require("../middleware/authMiddleware");

const router = Router();

router.post("/register", UserController.register);
router.post("/login", UserController.login);
router.post("/logout", UserController.logout);

router.get("/me", AuthMiddleware.isAuthenticated, UserController.getMe);

module.exports = router;
