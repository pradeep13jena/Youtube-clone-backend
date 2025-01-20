import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
  },
  text: {
    type: String,
    required: true,
    trim: true,
  },
  timestamp: {
    type: Date,
    required: true,
  },
  likes: {
    type: Number,
    default: 0,
    min: 0,
  },
  dislikes: {
    type: Number,
    default: 0,
    min: 0,
  },
});

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  thumbnail: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return /^(http|https):\/\/[^\s]+$/.test(v); // Validates URL format
      },
      message: "Invalid URL format",
    },
  },
  videoLink: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return /^(http|https):\/\/[^\s]+$/.test(v); // Validates URL format
      },
      message: "Invalid URL format",
    },
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  categories: {
    type: [String],
    required: true,
    validate: {
      validator: function (v) {
        return v.length > 0; // Ensure the array is not empty
      },
      message: "Categories cannot be empty",
    },
  },
  channelName: {
    type: String,
    trim: true,
  },
  views: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  likes: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  uploadDate: {
    type: Date,
    required: true,
  },
  comments: {
    type: [commentSchema],
    default: [],
  },
  dislikedBy: {
    type: [mongoose.Schema.Types.ObjectId], // Array of user IDs who disliked the video
    ref: "User", // Reference to the User model
    default: [], // Default is an empty array
  },
});

const videoModel = mongoose.model("Video", videoSchema);

export default videoModel;
