import userModel from "../Models/users.model.js";
import videoModel from "../Models/videos.model.js";

export const addComment = async (req, res) => {
  const { username } = req.user;
  const { id, comment, likes = 0, dislikes = 0 } = req.body;
  console.log(username, id, comment);
  try {
    // Find the video by ID
    const video = await videoModel.findById(id);

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Construct the comment object
    const newComment = {
      username,
      text: comment,
      timestamp: new Date(),
      likes,
      dislikes,
    };

    // Add the comment to the comments array
    video.comments.push(newComment);

    // Save the updated video
    await video.save();

    res
      .status(200)
      .json({
        message: "Comment added successfully",
        comments: video.comments,
      });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
};

export const editComment = async (req, res) => {
  const { username } = req.user; // Extract username from authenticated user
  const { videoid, commentId, newComment } = req.body; // Extract video ID, comment ID, and new comment
  console.log(username);
  try {
    // Find the video by videoid
    const video = await videoModel.findOne({ _id: videoid });
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }
    // Find the comment by commentId within the video's comments array
    const commentIndex = video.comments.findIndex(
      (c) => c._id.toString() === commentId
    );

    if (commentIndex === -1) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const comment = video.comments[commentIndex];

    // Check if the comment belongs to the logged-in user
    if (comment.username !== username) {
      return res
        .status(403)
        .json({ message: "You can edit your own comments only" });
    }

    // Update the comment with the new text
    comment.text = newComment;

    video.save();

    // Return success response
    return res
      .status(200)
      .json({ message: "Comment updated successfully", video });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  }
};

export const deleteComment = async (req, res) => {
  const { username } = req.user; // The currently logged-in user's username
  const { id, commentId } = req.body; // Video ID and Comment ID
  console.log(username, id, commentId);
  try {
    // Find the video by ID
    const video = await videoModel.findById(id);

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Find the comment by ID in the comments array
    const commentIndex = video.comments.findIndex(
      (comment) => comment._id.toString() === commentId
    );

    if (commentIndex === -1) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const comment = video.comments[commentIndex];

    // Check if the comment belongs to the logged-in user
    if (comment.username !== username) {
      return res
        .status(403)
        .json({ message: "You can delete your own comments only" });
    }

    // Remove the comment
    video.comments.splice(commentIndex, 1);

    // Save the updated video document
    await video.save();

    res
      .status(200)
      .json({
        message: "Comment deleted successfully",
        comments: video.comments,
      });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
};
