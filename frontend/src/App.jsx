import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { BrandLoader } from './components/ui.jsx';
import { AfterSignIn, LoggedOutFallback, NotFound, OfflineBanner, StartupProblem } from './components/Guards.jsx';
import { NavGateProvider, useNavGate } from './lib/navGate.jsx';
import { useSession } from './lib/session.jsx';
import { AdminApplications, AdminReview } from './pages/AdminApplications.jsx';
import AdminOverview from './pages/AdminOverview.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import { AdminScholarships, ScholarshipForm } from './pages/AdminScholarships.jsx';
import { Login, Register } from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Home from './pages/Home.jsx';
import { Analytics, Recovery } from './pages/Insights.jsx';
import Landing from './pages/Landing.jsx';
import Profile from './pages/Profile.jsx';
import ScholarshipDetail from './pages/ScholarshipDetail.jsx';
import { Alerts, Applications, Documents } from './pages/StudentPages.jsx';

const PUBLIC_PATHS = ['/', '/login', '/register'];

export default function App() {
  const { user } = useSession();
  // Paths that only redirect are not held behind the loader.
  const skip = (path) => (user ? ['/login', '/register'].includes(path) : !PUBLIC_PATHS.includes(path));
  return (
    <NavGateProvider skip={skip}>
      <AppRoutes />
    </NavGateProvider>
  );
}

function AppRoutes() {
  const { user, ready, problem } = useSession();
  const gate = useNavGate();
  if (!ready) return <BrandLoader />;
  if (problem) return <StartupProblem message={problem} />;
  // Reloads and public pages: full-screen loader. Inside the app, the shell shows it instead.
  if (gate.showing && (gate.firstLoad || !user)) {
    return (
      <>
        <OfflineBanner />
        <BrandLoader />
        {user && <div hidden aria-hidden="true" inert><AppTree user={user} /></div>}
      </>
    );
  }
  return <AppTree user={user} />;
}

function AppTree({ user }) {

  if (!user) {
    return (
      <>
      <OfflineBanner />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<LoggedOutFallback />} />
      </Routes>
      </>
    );
  }

  const home = user.role === 'ADMIN' ? '/admin' : '/';
  return (
    <>
    <OfflineBanner />
    <Routes>
      <Route element={<Layout />}>
        {user.role === 'STUDENT' ? (
          <>
            <Route path="/" element={<Dashboard />} />
            <Route path="/scholarships" element={<Home />} />
            <Route path="/recovery" element={<Recovery />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/scholarships/:id" element={<ScholarshipDetail />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/alerts" element={<Alerts />} />
          </>
        ) : (
          <>
            <Route path="/admin" element={<AdminOverview />} />
            <Route path="/admin/scholarships" element={<AdminScholarships />} />
            <Route path="/admin/scholarships/new" element={<ScholarshipForm />} />
            <Route path="/admin/scholarships/:id" element={<ScholarshipForm />} />
            <Route path="/admin/applications" element={<AdminApplications />} />
            <Route path="/admin/applications/:id" element={<AdminReview />} />
            <Route path="/admin/users" element={<AdminUsers />} />
          </>
        )}
        <Route path="/login" element={<AfterSignIn home={home} />} />
        <Route path="/register" element={<AfterSignIn home={home} />} />
        <Route path="*" element={<NotFound home={home} />} />
      </Route>
    </Routes>
    </>
  );
}
