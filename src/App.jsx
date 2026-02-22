import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar.jsx';
import Footer from './components/Footer/Footer.jsx';

import Home from './pages/Home/home';
import About from './pages/About/about';
import Portfolio from "./pages/Portfolio/portfolio.jsx";
import Testimonials from './pages/Testimonials/testimonials';
import SignUp from './pages/SignUp/SignUp.jsx';
import Login from './pages/Login/Login.jsx';
import InquiryPage from "./pages/Inquiry/Inquiry.jsx";
import Services from './pages/Services/Services.jsx';
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
import AdminHome from './admin/pages/Home/Home.jsx';
import Sessions from './admin/pages/Sessions/Sessions.jsx';
import Availability from './admin/pages/Availability/Availability.jsx';
import Contacts from './admin/pages/Contacts/Contacts.jsx';
import ContactView from './admin/pages/Contacts/ContactView.jsx';
import Galleries from './admin/pages/Galleries/Galleries.jsx';
import Notifications from './admin/pages/Notifications/Notifications.jsx';
import Payments from './admin/pages/Payments/Payments.jsx';
import Forms from './admin/pages/Forms/Forms.jsx';
import Settings from './admin/pages/Settings/Settings.jsx';
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
  return (
    <div className='min-h-screen flex flex-col'>
      <IdleLogout />

      { /* temp dynamic navbar */}
      <Navbar />

      <main className='grow'>
        <AuthHashRouter>
          <Routes>
            <Route index element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/testimonials" element={<Testimonials />} />
            <Route path="/portfolio" element={<Portfolio />} />
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
              <Route path="contacts/:id" element={<ContactView />} />
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