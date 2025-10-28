import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className=''>
      <Link to="/">Home</Link> |{" "}
      <Link to="/about">About</Link> |{" "}
      <Link to="/testimonials">Testimonials</Link>
    </nav>
  );
}

export default Navbar