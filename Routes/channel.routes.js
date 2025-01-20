import {
  createChannel,
  deleteChannel,
  updateChannel,
  viewChannel,
} from "../Controller/channel.controller.js";
import { uploadVideo } from "../Controller/video.controller.js";
import { verifyToken } from "../Middlewares/verifyToken.js";

export const channel = (app) => {
  // Route to create a new channel
  app.post("/channel", verifyToken, createChannel);

  // Route to view a channel's details
  app.get("/channel/:channel", verifyToken, viewChannel);

  // Route to upload a video to a specific channel
  app.post("/channel/:channel/videos", verifyToken, uploadVideo);

  // Route to delete a specific channel
  app.delete("/channel/:Channel", verifyToken, deleteChannel);

  // Route to update a channel's details
  app.put("/channel/:channelName", verifyToken, updateChannel);
};
