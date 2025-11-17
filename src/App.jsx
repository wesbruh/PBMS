import { BrowserRouter, Routes, Route, useLocation, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar/navbar';
import Footer from './components/Footer/footer';
import Home from './pages/Home/home';
import About from './pages/About/about';
import Testimonials from './pages/Testimonials/testimonials';
import SignUp from './pages/SignUp/signup.jsx';
import Login from './pages/Login/login';
import InquiryPage from "./pages/Inquiry/index.jsx";
import Services from './pages/Services/services.jsx';
import Weddings from './pages/Special/Weddings.jsx';
import Labor from './pages/Special/Labor.jsx';
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ClientDashboard from "./pages/Dashboard/ClientDashboard.jsx";
import AuthCallback from "./pages/Auth/AuthCallback.jsx";
import AuthHashRouter from './components/AuthHashRouter.jsx';

// temp admin entrance
import AdminRoutes from './admin/routes'
import AdminNavbar from './admin/components/Navbar/navbar';

import SessionRoute from "./pages/SessionRoute.jsx";

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
      <AuthHashRouter>
        <Routes>
          <Route index element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/testimonials" element={<Testimonials />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path ="/login" element={<Login />} />
          <Route path="/services/weddings" element={<Weddings />} />
          <Route path="/services/labor-and-delivery" element={<Labor />} />
          <Route path="/services" element={<Services />} />
          <Route path="/inquiry" element={<InquiryPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <ClientDashboard />
            </ProtectedRoute>} 
          />
          {/* temp admin entrance and booking page for signed-in users*/}
          <Route
              path="/session"
              element={
                <ProtectedRoute>
                  <SessionRoute />
                </ProtectedRoute>
              }
            />
          {/* admin */}
          {AdminRoutes()}
        </Routes>
      </AuthHashRouter>
      </main>

      <Footer />
    </div>
  );
}

export default App
