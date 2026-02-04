import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Protect routes
export const protect = async (req, res, next) => {
    let token = req.headers.authorization;
    if (!token) return res.status(401).json({ message: "Not authorized" });

    try {
        token = token.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select("-password");
        next();
    } catch (err) {
        res.status(401).json({ message: "Token invalid" });
    }
};

// Role-based access
export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Role not authorized" });
        }
        next();
    };
};
