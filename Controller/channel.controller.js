import mongoose from "mongoose";
import channelModel from "../Models/channel.model.js";
import userModel from "../Models/users.model.js";
import { channel } from "../Routes/channel.routes.js";

// Aggregation pipeline to pull Channel details along with video it has.
const getVideoDetails = async (channelName) => {
  try {
    const channelExpand = await mongoose.connection.db
      .collection("channels")
      .aggregate([
        // Match the specific channel by channelName
        {
          $match: { channelName: channelName },
        },

        // Lookup to get video details by matching the ObjectIds in the "videos" array
        {
          $lookup: {
            from: "videos", // The collection to join with
            localField: "videos", // The array of ObjectIds in the channel object
            foreignField: "_id", // The field to match in the "videos" collection
            as: "videoDetails", // The new field to store matched video details
          },
        },

        // Project to format the output and include the necessary fields
        {
          $project: {
            channelName: 1,
            owner: 1,
            description: 1,
            channelBanner: 1,
            channelLogo: 1,
            subscribers: 1,
            videos: 1, // Keep the original video ObjectIds
            videoDetails: 1, // Include the matched video details
          },
        },
      ])
      .toArray(); // Ensure you convert the cursor to an array

    // Check if result is empty
    if (channelExpand.length === 0) {
      throw new Error("Channel not found or no video details available.");
    }

    return channelExpand[0]; // Return the first (and only) result since channelName is unique
  } catch (error) {
    throw new Error(`Failed to fetch video details: ${error.message}`);
  }
};

// Pull user details along with the channel details
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

// Exporting an asynchronous function named `createChannel` to handle channel creation.
export const createChannel = async (req, res) => {
  // Extracting required fields from the request body.
  const { channelName, description, channelBanner, channelLogo } = req.body;

  // Validating the input fields to ensure required data is present and correctly formatted.
  if (
    !channelLogo || // Check if channelLogo is missing.
    !channelName || // Check if channelName is missing.
    !description || // Check if description is missing.
    typeof channelLogo !== "string" || // Validate channelLogo is a string.
    typeof channelName !== "string" || // Validate channelName is a string.
    typeof description !== "string" || // Validate description is a string.
    channelLogo.trim() === "" || // Ensure channelLogo is not an empty string.
    channelName.trim() === "" || // Ensure channelName is not an empty string.
    description.trim() === "" // Ensure description is not an empty string.
  ) {
    // Return a 400 (Bad Request) response with an error message if validation fails.
    return res
      .status(400)
      .json({ error: "Invalid channelName or description" });
  }

  // Check if a channel with the same name already exists (case-insensitive).
  const existingChannel = await channelModel.findOne({
    channelName: channelName.toLowerCase(),
  });
  if (existingChannel) {
    // Return a 403 (Forbidden) response if the channel already exists.
    return res.status(403).json({ message: "Channel already exists" });
  }

  // Create a new channel document using the `channelModel`.
  const newChannel = new channelModel({
    channelName: channelName.trim(), // Trim leading/trailing spaces from the channel name.
    description, // Use the provided description.
    owner: req.user.username, // Set the channel owner to the username from the request object.
    channelBanner, // Set the channel banner.
    channelLogo, // Set the channel logo.
  });

  // Save the new channel to the database.
  const savedChannel = await newChannel.save();

  if (savedChannel) {
    // If the channel is successfully saved, update the owner's user record.
    const user = await userModel.findOne({ username: req.user.username });
    user.channels.push(channelName); // Add the new channel's name to the user's channel list.
    await user.save(); // Save the updated user document.
  }

  // Retrieve updated user details (including newly created channel).
  const newUser = await getUserDetails(req.user.username);

  // Send a 201 (Created) response with a success message and the updated user details.
  res
    .status(201)
    .json({ message: "Channel created successfully", user: newUser });
};

// Logic to view channel.
export const viewChannel = async (req, res) => {
  try {
    const { channel } = req.params; // Destructure the given url parameter

    // Basic validation to check the given input
    if (!channel || typeof channel !== "string" || channel.trim() === "") {
      return res.status(400).json({ message: "Invalid channel name provided" });
    }

    // Pull out the give channel using URL
    const checkChannel = await getVideoDetails(channel);

    // Check if the returned value is empty or not, if empty then return an error
    if (!checkChannel) {
      return res.status(404).json({ message: "No such channel" });
    }

    res.status(200).json(checkChannel);
  } catch (error) {
    res
      .status(500)
      .json({ message: "An unexpected error occurred", error: error.message });
  }
};

// Logic to delete channel.
export const deleteChannel = async (req, res) => {
  const { Channel } = req.params;
  console.log(Channel)
  if (!Channel || Channel.trim() === "") {
    return res
      .status(400)
      .json({ message: "Channel name is required & cannot be empty" });
  }

  try {
    const user = await userModel.findOne({ username: req.user.username });

    // Deleting the channel from the channelModel
    const ChannelExists = await channelModel.findOneAndDelete({
      channelName: Channel,
    });

    if (ChannelExists) {
      // Remove the channel from the user's channels array
      await userModel.updateOne(
        { username: req.user.username },
        {
          $pull: { channels: Channel }, // Corrected to use 'Channel'
        }
      );
      return res.status(200).json({ message: "Channel deleted successfully" });
    } else {
      return res.status(404).json({ message: "Channel not found" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Logic to update channel
export const updateChannel = async (req, res) => {
  try {
    const { channelBanner, channelLogo, description, newChannelName } =
      req.body;
    const { channelName } = req.params;

    // Check if at least one field is present in the request body
    if (!channelBanner && !channelLogo && !description && !newChannelName) {
      return res.status(400).json({ message: "No data present to update." });
    }

    // Ensure the current channelName is provided to locate the channel
    if (!channelName) {
      return res.status(400).json({
        message: "Current channel name is required to update the channel.",
      });
    }

    // Find the channel by current name
    const channel = await channelModel.findOne({ channelName });

    // If the channel doesn't exist, return an error
    if (!channel) {
      return res.status(404).json({ message: "Channel not found." });
    }

    // Update the fields that are provided
    if (channelBanner) channel.channelBanner = channelBanner;
    if (channelLogo) channel.channelLogo = channelLogo;
    if (description) channel.description = description;

    // If a new channel name is provided, check for conflicts and update
    if (newChannelName) {
      const existingChannel = await channelModel.findOne({
        channelName: newChannelName,
      });
      if (existingChannel) {
        return res
          .status(409)
          .json({ message: "The new channel name is already in use." });
      }
      channel.channelName = newChannelName.trim();
    }
    // Save the updated channel to the database
    await channel.save();

    await userModel.updateOne(
      { username: req.user.username },
      {
        $pull: { channels: channelName }, // Remove the old channel name (or id, depending on your schema)
      }
    );

    await userModel.updateOne(
      { username: req.user.username },
      {
        $push: { channels: newChannelName }, // Add the new channel name (or id)
      }
    );

    // Send a success response with the updated channel data
    res.status(200).json({ message: "Channel updated successfully.", channel });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "An error occurred while updating the channel.",
      error,
    });
  }
};
