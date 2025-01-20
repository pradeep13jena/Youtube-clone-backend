import { addLiked, removeLiked } from "../Controller/Likes.controller.js";
import { verifyToken } from "../Middlewares/verifyToken.js";

export const like = (app) => {
  // Add a like to a post or item by ID
  app.put("/like/:id", verifyToken, addLiked);

  // Remove a like (dislike) from a post or item by ID
  app.put("/dislike/:id", verifyToken, removeLiked);
};
