import mongoose from "mongoose";
import userModel from "../Models/users.model.js";

const getUserDetails = async (username) => {
  try {
    const userDetails = await mongoose.connection.db
      .collection("users")
      .aggregate([
        // Match the user by their username
        {
          $match: { username: username }, // Replace with dynamic username
        },

        // Lookup for channel details based on the channels array
        {
          $lookup: {
            from: "channels", // Lookup channels collection
            localField: "channels", // Field in the current document (Array of channel names)
            foreignField: "channelName", // Match against channelName in channels collection
            as: "channelDetails", // Store the matched channel details in this new field
          },
        },

        // Lookup for subscription details based on the subscription array
        {
          $lookup: {
            from: "channels", // Lookup channels collection
            localField: "subscription", // Field in the current document (Array of subscribed channel names)
            foreignField: "channelName", // Match against channelName in channels collection
            as: "subscriptionDetails", // Store the matched subscription details in this new field
          },
        },

        // Lookup for video details from the videos collection based on video ObjectIds in playlists
        {
          $lookup: {
            from: "videos", // The collection containing video documents
            localField: "playlists.videos", // The field in the current document (Array of ObjectIds)
            foreignField: "_id", // The field in the "videos" collection (ObjectId)
            as: "videoDetails", // Store the matched video details in this new field
          },
        },

        // Re-project the document and populate video details in playlists
        {
          $project: {
            username: 1,
            name: 1,
            avatar: 1,
            channelDetails: 1, // Include populated channel details
            subscriptionDetails: 1, // Include populated subscription details
            playlists: {
              // For each playlist, map the videos array to match details
              $map: {
                input: "$playlists",
                as: "playlist",
                in: {
                  name: "$$playlist.name",
                  videos: {
                    // Map over the videos in the playlist to match video details
                    $map: {
                      input: "$$playlist.videos",
                      as: "videoId",
                      in: {
                        $let: {
                          vars: {
                            videoDetail: {
                              $arrayElemAt: [
                                {
                                  $filter: {
                                    input: "$videoDetails", // Array of matched videos
                                    as: "videoDetail",
                                    cond: {
                                      $eq: ["$$videoDetail._id", "$$videoId"],
                                    },
                                  },
                                },
                                0,
                              ],
                            },
                          },
                          in: {
                            $ifNull: [
                              "$$videoDetail", // Return video details if found
                              {
                                _id: "$$videoId",
                                title: "Unknown Video",
                                description: "No details available",
                              }, // Fallback if no match found
                            ],
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ])
      .toArray();
    return userDetails.length > 0 ? userDetails[0] : null; // Return a single user or null
  } catch (error) {
    throw new Error(`Failed to fetch user details: ${error.message}`);
  }
};

// To create playlists
export const createPlaylist = async (req, res) => {
  const { playlistName } = req.body;

  if (
    !playlistName ||
    typeof playlistName !== "string" ||
    playlistName.trim() === ""
  ) {
    return res
      .status(400)
      .json({ message: "Channel name is required & cannot be empty" });
  }

  try {
    const user = await userModel.findOne({ username: req.user.username });

    const playlistExists = user.playlists.some(
      (playlist) => playlist.name === playlistName
    );

    if (playlistExists) {
      return res.status(403).json({ message: "Playlist already exists" });
    }

    const updatedDocument = await userModel.updateOne(
      { username: req.user.username },
      {
        $push: {
          playlists: { name: playlistName.trim(), videos: [] }, // Add the new playlist
        },
      },
      { upsert: true }
    );

    const newUser = await getUserDetails(req.user.username);
    return res
      .status(201)
      .json({ message: "Playlist created successfully", newUser });
  } catch (error) {
    console.error("Error creating playlist:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// To delete playlists
export const deletePlaylist = async (req, res) => {
  const { playlist } = req.params;

  if (!playlist || playlist.trim() === "") {
    return res
      .status(400)
      .json({ message: "Playlist name is required & cannot be empty" });
  }

  try {
    const user = await userModel.findOne({ username: req.user.username });

    const playlistExists = user.playlists.some(
      (list) => list.name === playlist
    );

    if (!playlistExists) {
      return res.status(404).json({ message: "Playlist does not exist" });
    }

    await userModel.updateOne(
      { username: req.user.username },
      {
        $pull: { playlists: { name: playlist } },
      }
    );
    const newUser = await getUserDetails(req.user.username);
    return res
      .status(200)
      .json({ message: "Playlist deleted successfully", newUser });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// To add video to the channel
export const addVideoToPlaylist = async (req, res) => {
  const { id } = req.params; // Video ID
  const { userName, playlistName } = req.body;

  // Check if the video ID is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(404)
      .send({ message: "Given ID is not a valid Video ID" });
  }

  // Validate input fields
  if (!userName || !playlistName) {
    return res
      .status(400)
      .send({ message: "Username and playlist name are required." });
  }

  try {
    // Find the user by username
    const user = await userModel.findOne({ username: userName });
    console.log(user);
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    // Find the playlist within the user's playlists
    const playlist = user.playlists.find((pl) => pl.name === playlistName);
    if (!playlist) {
      return res
        .status(404)
        .send({
          message: `Playlist '${playlistName}' not found for user '${userName}'.`,
        });
    }

    // Check if the video is already in the playlist
    const videoIndex = playlist.videos.indexOf(id);

    if (videoIndex !== -1) {
      // Video already exists in the playlist; remove it
      playlist.videos.splice(videoIndex, 1);
      await user.save();
      const data = await getUserDetails(userName)
      return res.status(200).json({
        message: `Video removed from playlist '${playlistName}'.`,
        userDetails : data
      });
    }

    // Add the video to the playlist
    playlist.videos.push(id);
    await user.save();
    const data = await getUserDetails(userName)
    res.status(200).json({
      message: `Video added to playlist '${playlistName}'.`,
      userDetails : data
    });
  } catch (error) {
    console.error("Error adding video to playlist:", error);
    res.status(500).send({
      message: "An error occurred while processing your request.",
      error: error.message,
    });
  }
};
