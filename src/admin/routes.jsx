// src/admin/routes.jsx
import { Outlet, Route } from 'react-router-dom';
import AdminHome from './pages/Home/home';
import Sessions from './pages/Sessions/sessions';
import Contacts from './pages/Contacts/contacts';
import Galleries from './pages/Galleries/galleries';
import Notifications from './pages/Notifications/notifications';
import Payments from './pages/Payments/payments';
import Forms from './pages/Forms/forms';
import Settings from './pages/Settings/settings';
import QuestionnairesList from './pages/Forms/Questionnaires/QuestionnairesList';
import QuestionnaireEditor from './pages/Forms/Questionnaires/QuestionnairesEditor';

// this component only defines nested <Route>s; no <Routes> inside
export default function AdminRoutes() {
  return (
    <Route path="admin" element={<Outlet />}>
      <Route index element={<AdminHome />} />
      <Route path="sessions" element={<Sessions />} />
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
  );
}
