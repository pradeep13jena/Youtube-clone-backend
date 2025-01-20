import jwt from "jsonwebtoken";
import userModel from "../Models/users.model.js";

export const verifyToken = async (req, res, next) => {
  // Check if the authorization header is present and starts with 'JWT'
  if (
    req.headers &&
    req.headers.authorization &&
    req.headers.authorization.split(" ")[0] === "JWT"
  ) {
    try {
      const token = req.headers.authorization.split(" ")[1];

      // Verify the token
      const verifiedToken = jwt.verify(token, "E<x?XbO8dKI{p;9");

      // Find the user based on the token's ID
      const findUser = await userModel.findOne({ _id: verifiedToken._id });

      if (!findUser) {
        return res.status(403).json({ message: "Invalid Web Token" });
      }

      // Attach the user to the request objects
      req.user = findUser;
      next();
    } catch (error) {
      return res.status(403).json({ message: error.message });
    }
  } else {
    return res.status(401).json({ message: "Token not present" });
  }
};
