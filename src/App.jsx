// import { useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Navbar from './components/Navbar/navbar.jsx'
import Footer from './components/Footer/footer.jsx'
import Home from './pages/Home/home.jsx'
import About from './pages/About/about.jsx'
import Testimonials from './pages/Testimonials/testimonials.jsx';
import SignUp from './pages/SignUp/SignUp.jsx';
import Login from './pages/Login/login.jsx';
import InquiryPage from "./pages/Inquiry/index.jsx";
<<<<<<< Updated upstream

=======
import Services from './pages/Services/services.jsx';
import Weddings from './pages/Special/Weddings.jsx';
import Labor from './pages/Special/Labor.jsx';
>>>>>>> Stashed changes

function App() {
  // const [count, setCount] = useState(0)

  return (
    <BrowserRouter>
    <div className='min-h-screen flex flex-col'>
      <Navbar />
<<<<<<< Updated upstream
      <main className ='flex-grow'>
=======
      <main className ='grow'>
>>>>>>> Stashed changes
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/testimonials" element={<Testimonials />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path ="/login" element={<Login />} />
<<<<<<< Updated upstream
=======
        <Route path="/services/weddings" element={<Weddings />} />
        <Route path="/services/labor-and-delivery" element={<Labor />} />
        <Route path="/services" element={<Services />} />
>>>>>>> Stashed changes
        <Route path="/inquiry" element={<InquiryPage />} />
      </Routes>
      </main>

      <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App
