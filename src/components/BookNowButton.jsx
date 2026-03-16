import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function BookNowButton({className = "", children = "BookNow"}){
    const navigate = useNavigate();
    const {user, loading} = useAuth();

    const handleClick = () =>{
        if(loading) return; // wait for auth status to load
        if(user){
            navigate("/dashboard/inquiry");
        }
        else{
            navigate("/signup");
        }
    };
    return(
        <button
        type = "button"
        onClick={handleClick}
        disabled={loading}
        className={className}
        >
            {children}    
        </button>
    );
}
export default BookNowButton;