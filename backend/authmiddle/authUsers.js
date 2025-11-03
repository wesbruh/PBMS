

import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {

    try{
        const authHeader = req.headers.authorization;
        if(!authHeader || !authHeader.startsWith("Bearer ")){
            return res.status(401).json({ message: "Access denied. No token provided."});
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        req.user = decoded;
        next();
       } catch (err) {
        return res.status(403).json({ message: "Invalid or expired token." });
       }
};