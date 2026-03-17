import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function BookNowButton({
  className = "flex justify-center items-center w-full mt-6 bg-brown hover:bg-[#AB8C4B] h-12 text-white text-sm rounded-3xl transition",
  label = "Book Now"
}) {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const handleClick = () => {
    if (loading) return; // wait for auth status to load
    if (user) {
      navigate("/dashboard/inquiry");
    }
    else {
      navigate("/signup");
    }
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {label}
    </button>
  );
}
export default BookNowButton;