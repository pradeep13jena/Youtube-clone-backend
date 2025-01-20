import userModel from "../Models/users.model.js";
import videoModel from "../Models/videos.model.js";
import channelModel from "../Models/channel.model.js";
import mongoose from "mongoose";

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

export const subscribed = async (req, res) => {
  const { _id } = req.user; // User ID from the request
  const { channelName } = req.body; // Channel name from the request body
  const { username } = req.user;

  try {
    // Find the user by ID
    const user = await userModel.findById(_id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Find the channel by name
    const channel = await channelModel.findOne({ channelName: channelName });
    if (!channel) {
      return res.status(404).json({ message: "Channel not found." });
    }

    // Check if the channel is already in the subscription array
    const isSubscribed = user.subscription.includes(channelName);

    if (isSubscribed) {
      // If subscribed, remove it from the array and decrease the subscriber count
      user.subscription = user.subscription.filter(
        (name) => name !== channelName
      );
      channel.subscribers = Math.max(0, channel.subscribers - 1); // Ensure it doesn't go below 0
    } else {
      // If not subscribed, add it to the array and increase the subscriber count
      user.subscription.push(channelName);
      channel.subscribers += 1;
    }

    // Save the updated user and channel
    await user.save();
    await channel.save();

    res.status(200).json({
      message: isSubscribed
        ? `Unsubscribed from ${channelName}.`
        : `Subscribed to ${channelName}.`,
      userSubscriptions: user,
      channelSubscribersCount: channel,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Something went wrong.", error: error.message });
  }
};
