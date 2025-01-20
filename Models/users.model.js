import mongoose, { Schema } from "mongoose";

// Playlist Schema
const playlistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  videos: {
    type: [Schema.Types.ObjectId],
    default: [],
  },
});

// User Schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
    unique: true,
    match: [
      /^[a-zA-Z\s]+$/, // Only allows letters and spaces
      "Please provide a valid name (only letters and spaces are allowed)",
    ],
  },
  password: {
    type: String,
    required: true,
  },
  avatar: {
    type: String,
    default:
      "https://ik.imagekit.io/kf28wicizj/Youtube/userimage.jpg?updatedAt=1735815283840",
  },
  channels: {
    type: [String],
  },
  subscription: {
    type: [String],
    default: [],
  },
  playlists: {
    type: [playlistSchema],
    default: [
      { name: "Liked Videos", videos: [] },
      { name: "Watch Later", videos: [] },
    ],
  },
});

const userModel = mongoose.model("User", userSchema);

export default userModel;
