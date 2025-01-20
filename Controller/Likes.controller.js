import userModel from "../Models/users.model.js";
import videoModel from "../Models/videos.model.js";

export const addLiked = async (req, res) => {
  const { id } = req.params; // video ID
  const { username } = req.user; // username of the user

  try {
    // Find the video and user
    const video = await videoModel.findOne({ _id: id });
    const user = await userModel.findOne({ username: username });

    // Check if the video and user exist
    if (!video || !user) {
      return res.status(404).json({ message: "Video or User not found" });
    }

    // Check if the video is already in the user's playlist (liked)
    const videoInPlaylist = user.playlists[0].videos.includes(video._id);

    if (videoInPlaylist) {
      // If already liked (video is in the playlist), unlike the video
      // Remove video ID from the user's playlist
      user.playlists[0].videos = user.playlists[0].videos.filter(
        (videoId) => videoId.toString() !== video._id.toString()
      );

      // Decrease the like count of the video
      video.likes -= 1;

      // Save the changes to the user and video
      await user.save();
      await video.save();

      return res.status(200).json({ message: "Video unliked", video, user });
    } else {
      // If not already liked, like the video
      // Add video ID to the user's playlist
      user.playlists[0].videos.push(video._id);

      // Increase the like count of the video
      video.likes += 1;

      // Save the changes to the user and video
      await user.save();
      await video.save();

      return res.status(200).json({ message: "Video liked", video, user });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const removeLiked = async (req, res) => {
  const { id } = req.params; // video ID
  const { _id } = req.user; // user ID of the user

  try {
    // Find the video and user
    const video = await videoModel.findOne({ _id: id });
    const user = await userModel.findOne({ _id: _id });

    // Check if the video and user exist
    if (!video || !user) {
      return res.status(404).json({ message: "Video or User not found" });
    }

    // Check if the _id is already in the dislikedBy array
    const userHasDisliked = video.dislikedBy.includes(user._id);

    if (userHasDisliked) {
      // If user has already disliked, remove them from the dislikedBy array
      video.dislikedBy = video.dislikedBy.filter(
        (userId) => userId.toString() !== user._id.toString()
      );

      // Save changes to the video
      await video.save();

      return res.status(200).json({
        message: "Dislike removed",
        dislikedBy: video.dislikedBy,
      });
    } else {
      // If user has not disliked, add them to the dislikedBy array
      video.dislikedBy.push(user._id);

      // Save changes to the video
      await video.save();

      return res.status(200).json({
        message: "Disliked successfully",
        dislikedBy: video.dislikedBy,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};
