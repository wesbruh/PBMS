import { BrowserRouter, Routes, Route, useLocation, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar/navbar';
import Footer from './components/Footer/footer';
import Home from './pages/Home/home';
import About from './pages/About/about';
import Testimonials from './pages/Testimonials/testimonials';
import SignUp from './pages/SignUp/signup';
import Login from './pages/Login/login';
import InquiryPage from "./pages/Inquiry/index.jsx";
// temp admin entrance
import AdminRoutes from './admin/routes'
import AdminNavbar from './admin/components/Navbar/navbar';

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const loc = useLocation();
  const isAdminPage = loc.pathname.startsWith('/admin');

  return (
    <div className='min-h-screen flex flex-col'>
      { /* temp dynamic navbar */ }
      {
        isAdminPage ?
        <AdminNavbar /> : <Navbar />
      }
      <main className='grow'>
        <Routes>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="testimonials" element={<Testimonials />} />
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<SignUp />} /> 
          <Route path="inquiry" element={<InquiryPage />} />
          {/* temp admin entrance*/}
          {AdminRoutes()}
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App
