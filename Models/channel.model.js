import mongoose from "mongoose";

const channelSchema = new mongoose.Schema({
  channelName: {
    type: String,
    required: true,
    trim: true,
  },
  owner: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  channelBanner: {
    type: String,
    default:
      "https://ik.imagekit.io/kf28wicizj/Youtube/Untitled%20design.png?updatedAt=1736418477272",
    validate: {
      validator: function (v) {
        return /^(http|https):\/\/[^\s]+$/.test(v); // Validates URL format
      },
      message: "Invalid URL format",
    },
  },
  channelLogo: {
    type: String,
    default:
      "https://ik.imagekit.io/kf28wicizj/Youtube/Untitled%20design%20(1).png?updatedAt=1736419152703",
    validate: {
      validator: function (v) {
        return /^(http|https):\/\/[^\s]+$/.test(v); // Validates URL format
      },
      message: "Invalid URL format",
    },
  },
  subscribers: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  videos: {
    type: [mongoose.Schema.Types.ObjectId], // Array of video IDs
    required: true,
    default: [],
  },
});

const channelModel = mongoose.model("Channel", channelSchema);

export default channelModel;
