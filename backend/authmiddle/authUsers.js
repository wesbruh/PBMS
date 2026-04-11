    import { supabase } from "../supabaseClient.js"
    export const verifyToken = async (req, res, next) => {
        try {
            const authHeader = req.headers["authorization"];

            if(!authHeader || !authHeader.startsWith("Bearer ")){
                return res.status(401).json({ message: "Access denied. No token provided."});
            }

            const token = authHeader.split(" ")[1];
            const { data, error } = await supabase.auth.getClaims(token)
            
            if (error || data?.claims?.role !== "authenticated")
                throw error ?? new Error("Invalid or expired token.");
            
            const userId = data.claims.sub;

            const { data: userData, error: userError} = await supabase
                .from("User")
                .select("UserRole(Role(name))")
                .eq("id", userId)
                .single()
            
            if (userError) throw userError;
            
            req.user = {id: userId};
            req.role = userData.UserRole.Role;
            next();
        } catch (error) {
            console.error(error);
            return res.status(403).json({ message: "Invalid or expired token." });
        }
    };