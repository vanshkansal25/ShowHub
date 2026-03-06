import { Router } from "express";
import { generateAccessToken, loginUser, logoutUser, registerUser, resetPassword } from "../controllers/user.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const userRouter = Router();

userRouter.post("/register",registerUser)
userRouter.post("/login",loginUser)
userRouter.post("/logout",authMiddleware,logoutUser)
userRouter.post("/reset-Password",authMiddleware,resetPassword)
userRouter.post("/generateToken",authMiddleware,generateAccessToken)

export default userRouter