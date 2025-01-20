import mongoose from "mongoose";
import express from "express";

// enable cors.
import cors from "cors";

// Accesing routes for backend
import { videoRoutes } from "./Routes/video.routes.js";
import { registration } from "./Routes/user.routes.js";
import { channel } from "./Routes/channel.routes.js";
import { playlist } from "./Routes/playlist.routes.js";
import { like } from "./Routes/like.routes.js";
import { subscribe } from "./Routes/subscribe.routes.js";
import { comment } from "./Routes/comment.routes.js";

const port = 5000;
const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

mongoose.connect(
  "mongodb+srv://goldrushatjenas:CWWpxzrkNnRffbyH@cluster0.iglry.mongodb.net/Youtube"
);

mongoose.connection.on("connected", () => console.log("Database connected"));
mongoose.connection.on("error", (err) =>
  console.error("Database connection error:", err)
);

app.listen(port, () => {
  console.log("Backend, up and running");
});

videoRoutes(app);
registration(app);
channel(app);
playlist(app);
like(app);
subscribe(app);
comment(app);
