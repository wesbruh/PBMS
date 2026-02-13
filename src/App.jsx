import { BrowserRouter, Routes, Route, useLocation, Outlet } from 'react-router-dom';
import AdminNavbar from './admin/components/shared/Navbar/navbar';
import Navbar from './components/Navbar/navbar';
import Footer from './components/Footer/footer';

import Home from './pages/Home/home';
import About from './pages/About/about';
import Testimonials from './pages/Testimonials/testimonials';
import SignUp from './pages/SignUp/SignUp.jsx';
import Login from './pages/Login/login';
import InquiryPage from "./pages/Inquiry/index.jsx";
import Services from './pages/Services/services.jsx';
import Weddings from './pages/Special/Weddings.jsx';
import Labor from './pages/Special/Labor.jsx';

import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ClientDashboard from "./pages/Dashboard/ClientDashboard.jsx";
import AuthCallback from "./pages/Auth/AuthCallback.jsx";
import AuthHashRouter from './components/AuthHashRouter.jsx';
import ContractsPage from "./pages/Dashboard/Contracts.jsx";
import ContractDetail from "./pages/Dashboard/ContractDetail.jsx";
import IdleLogout from './components/IdleLogout.jsx';

// Protected Admin Routes
import AdminRoute from './admin/components/shared/ProtectedRoute.jsx'
import AdminHome from './admin/pages/Home/home';
import Sessions from './admin/pages/Sessions/sessions';
import Availability from './admin/pages/Availability/availability';
import Contacts from './admin/pages/Contacts/contacts';
import Galleries from './admin/pages/Galleries/galleries';
import Notifications from './admin/pages/Notifications/notifications';
import Payments from './admin/pages/Payments/payments';
import Forms from './admin/pages/Forms/forms';
import Settings from './admin/pages/Settings/settings';
import QuestionnairesList from './admin/pages/Forms/Questionnaires/QuestionnairesList';
import QuestionnaireEditor from './admin/pages/Forms/Questionnaires/QuestionnairesEditor';

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
      <IdleLogout />

      { /* temp dynamic navbar */}
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
            <Route path="/login" element={<Login />} />
            <Route path="/inquiry" element={<InquiryPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Services */}
            <Route path="services" element={<Outlet />}>
              <Route index element={<Services />} />
              <Route path="weddings" element={<Weddings />} />
              <Route path="labor-and-delivery" element={<Labor />} />
            </Route>

            {/* Protected User Routes */}
            <Route path="dashboard" element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
              <Route index element={<ClientDashboard />} />
              <Route path="contracts" element={<ContractsPage />} />
              <Route path="contracts/:id" element={<ContractDetail />} />
            </Route>

            {/* Protected Admin Routes */}
            <Route path="admin" element={<AdminRoute><Outlet /></AdminRoute>}>
              <Route index element={<AdminHome />} />
              <Route path="sessions" element={<Sessions />} />
              <Route path="availability" element={<Availability />} />
              <Route path="contacts" element={<Contacts />} />
              <Route path="galleries" element={<Galleries />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="payments" element={<Payments />} />
              <Route path="forms" element={<Forms />}>
                <Route index element={<QuestionnairesList />} />
                <Route path="questionnaires" element={<QuestionnairesList />} />
                <Route path="questionnaires/new" element={<QuestionnaireEditor mode="create" />} />
                <Route path="questionnaires/:id/edit" element={<QuestionnaireEditor mode="edit" />} />
              </Route>
              <Route path="settings" element={<Settings />} />
            </Route>

          </Routes>
        </AuthHashRouter>
      </main>

      <Footer />
    </div >
  );
}

export default App