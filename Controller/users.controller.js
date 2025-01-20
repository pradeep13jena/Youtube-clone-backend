import mongoose from "mongoose";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
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

export const register = async (req, res) => {
  const { name, username, password, avatar } = req.body;

  if (!username || !password || !name) {
    return res
      .status(400)
      .json({ error: "Username, password, and name are required" });
  }

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    typeof name !== "string"
  ) {
    return res
      .status(400)
      .json({ error: "Username, password, and name must be strings" });
  }

  if (username.trim() === "" || password.trim() === "" || name.trim() === "") {
    return res
      .status(400)
      .json({
        error: "Username, password, and name cannot contain only whitespace",
      });
  }

  if (
    avatar &&
    (typeof avatar !== "string" || !/^(https?:\/\/[^\s]+)$/.test(avatar))
  ) {
    return res
      .status(400)
      .json({ error: "Avatar must be a valid URL if provided" });
  }

  const existingUser = await userModel.findOne({
    username: username.toLowerCase(),
  });
  if (existingUser) {
    return res.status(409).json({ error: "Username already exists" });
  }

  try {
    const hashedPassword = bcryptjs.hashSync(password, 10);
    const newUser = new userModel({
      username: username.toLowerCase(),
      name: name.toLowerCase(),
      password: hashedPassword,
      avatar, // Directly use the provided avatar (default URL will apply if omitted)
    });

    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

export const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  if (typeof username !== "string" || typeof password !== "string") {
    return res
      .status(400)
      .json({ error: "Username and password must be strings" });
  }

  if (username.trim() === "" || password.trim() === "") {
    return res
      .status(400)
      .json({ error: "Username and password cannot contain only whitespace" });
  }

  try {
    const checkUsername = await userModel.findOne({
      username: username.toLowerCase(),
    });
    if (!checkUsername) {
      return res.status(404).json({ error: "User is not registered" });
    }

    const validUser = bcryptjs.compareSync(password, checkUsername.password);
    if (!validUser) {
      return res.status(403).json({ error: "Password is incorrect" });
    }

    const token = jwt.sign({ _id: checkUsername._id }, "E<x?XbO8dKI{p;9", {
      expiresIn: "24h",
    });
    res.status(200).json({
      username: username,
      jwtToken: token,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "An unexpected error occurred", details: error.message });
  }
};

// TO get particular user details
export const getUser = async (req, res) => {
  const { username } = req.user;

  // Basic validation to check the username is provided
  if (!username) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // Chcek for the user in the db
    const user = await getUserDetails(username);
    // If not found then return np
    if (!user) {
      return res.status(404).json({ message: "No user found" });
    }

    // If found then return the user detail
    res.status(200).json(user);
  } catch (error) {
    // Otherwise the error message
    res.status(500).json({ message: error.message });
  }
};
