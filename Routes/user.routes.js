import { getUser, login, register } from "../Controller/users.controller.js";
import { verifyToken } from "../Middlewares/verifyToken.js";

export const registration = (app) => {
  // Register a new user
  app.post("/register", register);

  // Login an existing user
  app.post("/login", login);

  // Get user details (requires authentication)
  app.post("/user", verifyToken, getUser);
};
