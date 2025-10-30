// import { useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Navbar from './components/Navbar/navbar.jsx'
import Footer from './components/Footer/footer.jsx'
import Home from './pages/Home/home.jsx'
import About from './pages/About/about.jsx'
import Contact from './pages/Contact/contact.jsx'
import Testimonials from './pages/Testimonials/testimonials.jsx';
import SignUp from './pages/SignUp/SignUp.jsx';
import Login from './pages/Login/login.jsx';

function App() {
  // const [count, setCount] = useState(0)

  return (
    <BrowserRouter>
    <div className='min-h-screen flex flex-col'>
      <Navbar />
      <main className ='flex-grow'>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/testimonials" element={<Testimonials />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path ="/login" element={<Login />} />
      </Routes>
      </main>

      <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App
