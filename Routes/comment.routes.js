import { verifyToken } from "../Middlewares/verifyToken.js";
import {
  addComment,
  editComment,
  deleteComment,
} from "../Controller/comments.controller.js";

export const comment = (app) => {
  // Add a new comment
  app.post("/comment", verifyToken, addComment);

  // Edit an existing comment
  app.put("/comment", verifyToken, editComment);

  // Delete a comment
  app.delete("/comment", verifyToken, deleteComment);
};
