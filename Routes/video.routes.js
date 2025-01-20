import {
  deleteVideo,
  oneVideo,
  updateVideo,
  videosDisplay,
} from "../Controller/video.controller.js";
import { verifyToken } from "../Middlewares/verifyToken.js";

export const videoRoutes = (app) => {
  // Display all videos
  app.get("/videos", verifyToken, videosDisplay);

  // Get details of a single video by ID
  app.get("/videos/:id", verifyToken, oneVideo);

  // Update a video by video ID
  app.put("/videos/:videoId", verifyToken, updateVideo);

  // Delete a video by channel and video ID
  app.put("/videos/:channel/:id", verifyToken, deleteVideo);
};
