import {
  addVideoToPlaylist,
  createPlaylist,
  deletePlaylist,
} from "../Controller/playlist.controller.js";
import { verifyToken } from "../Middlewares/verifyToken.js";

export const playlist = (app) => {
  // Create a new playlist
  app.post("/playlist", verifyToken, createPlaylist);

  // Delete an existing playlist by name or ID
  app.post("/playlist/:playlist", verifyToken, deletePlaylist);

  // Add a video to a playlist by playlist ID
  app.put("/playlist/:id", verifyToken, addVideoToPlaylist);
};
