import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className= "w-full flex flex-wrap items-center gap-2.5 px-2 pr-2 py-3">
      <Link to="/">Home</Link> |{" "}
      <Link to="/about">About</Link> |{" "}
      <Link to="/testimonials">Testimonials</Link>
      <Link
       to="/login"
       className= "ml-auto shrink-0 inline-block px-4 py-1.5 bg-brown text-white text-sm leading-tight font-serif hover:bg-[#AB8C4B] transition border-2 border-black rounded-lg"
      >Log in</Link>
      <Link
       to="/signup"
       className="ml-2.5 shrink-0 inline-block px-4 py-1.5 bg-brown text-white text-sm leading-tight font-serif hover:bg-[#AB8C4B] transition border-2 border-black rounded-lg"
      >Create account</Link>
    </nav>
  );
}

export default Navbar