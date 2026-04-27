import { render, screen } from "@testing-library/react";
import App from "../../../src/App";

// Mock shared layout/components
jest.mock("../../../src/components/Navbar/Navbar.jsx", () => () => <div>Navbar Mock</div>);
jest.mock("../../../src/components/Footer/Footer.jsx", () => () => <div>Footer Mock</div>);
jest.mock("../../../src/components/IdleLogout.jsx", () => () => <div>IdleLogout Mock</div>);
jest.mock("../../../src/components/AuthHashRouter.jsx", () => ({ children }) => <>{children}</>);
jest.mock("../../../src/components/AdminNotificationToast.jsx", () => () => <div>AdminNotificationToast Mock</div>);

// Mock route guards
jest.mock("../../../src/components/ProtectedRoute.jsx", () => ({ children }) => (
  <div>
    ProtectedRoute Mock
    {children}
  </div>
));
jest.mock("../../../src/admin/components/shared/ProtectedRoute.jsx", () => ({ children }) => (
  <div>
    AdminRoute Mock
    {children}
  </div>
));

// Mock public pages
jest.mock("../../../src/pages/Home/Home.jsx", () => () => <div>Home Page</div>);
jest.mock("../../../src/pages/About/About.jsx", () => () => <div>About Page</div>);
jest.mock("../../../src/pages/Portfolio/Portfolio.jsx", () => () => <div>Portfolio Page</div>);
jest.mock("../../../src/pages/Testimonials/Testimonials.jsx", () => () => <div>Testimonials Page</div>);
jest.mock("../../../src/pages/SignUp/SignUp.jsx", () => () => <div>SignUp Page</div>);
jest.mock("../../../src/pages/SignUp/SignUpSuccess.jsx", () => () => <div>SignUp Success Page</div>);
jest.mock("../../../src/pages/Login/Login.jsx", () => () => <div>Login Page</div>);
jest.mock("../../../src/pages/Auth/AuthCallback.jsx", () => () => <div>Auth Callback Page</div>);
jest.mock("../../../src/pages/Inquiry/Inquiry.jsx", () => () => <div>Inquiry Page</div>);
jest.mock("../../../src/pages/Inquiry/InquirySuccess.jsx", () => () => <div>Inquiry Success Page</div>);
jest.mock("../../../src/pages/Services/Services.jsx", () => () => <div>Services Page</div>);
jest.mock("../../../src/pages/Special/Weddings.jsx", () => () => <div>Weddings Page</div>);
jest.mock("../../../src/pages/Special/Labor.jsx", () => () => <div>Labor Page</div>);

// Mock client dashboard pages
jest.mock("../../../src/pages/Dashboard/ClientDashboard.jsx", () => () => <div>Client Dashboard Page</div>);
jest.mock("../../../src/pages/Dashboard/Contracts.jsx", () => () => <div>Contracts Page</div>);
jest.mock("../../../src/pages/Dashboard/ContractView.jsx", () => () => <div>Contract View Page</div>);

// Mock admin pages
jest.mock("../../../src/admin/pages/Home/Home.jsx", () => () => <div>Admin Home Page</div>);
jest.mock("../../../src/admin/pages/Sessions/Sessions.jsx", () => () => <div>Sessions Page</div>);
jest.mock("../../../src/admin/pages/Availability/Availability.jsx", () => () => <div>Availability Page</div>);
jest.mock("../../../src/admin/pages/Contacts/Contacts.jsx", () => () => <div>Contacts Page</div>);
jest.mock("../../../src/admin/pages/Contacts/ContactView.jsx", () => () => <div>Contact View Page</div>);
jest.mock("../../../src/admin/pages/Contacts/AdminContractView.jsx", () => () => <div>Admin Contract View Page</div>);
jest.mock("../../../src/admin/pages/Galleries/Galleries.jsx", () => () => <div>Galleries Page</div>);
jest.mock("../../../src/admin/pages/Notifications/Notifications.jsx", () => () => <div>Notifications Page</div>);
jest.mock("../../../src/admin/pages/Payments/Payments.jsx", () => () => <div>Payments Page</div>);
jest.mock("../../../src/admin/pages/Forms/Forms.jsx", () => () => <div>Forms Page</div>);
jest.mock("../../../src/admin/pages/Settings/Settings.jsx", () => () => <div>Settings Page</div>);
jest.mock("../../../src/admin/pages/Forms/Contracts/ContractsEditor", () => () => <div>Contract Editor Page</div>);
jest.mock("../../../src/admin/pages/Forms/Questionnaires/QuestionnairesEditor", () => () => <div>Questionnaire Editor Page</div>);
jest.mock("../../../src/admin/pages/Offerings/OfferingsPage.jsx", () => () => <div>Offerings Page</div>);
jest.mock("../../../src/admin/pages/Offerings/SessionTypeEditor.jsx", () => (props) => (
  <div>
    SessionTypeEditor Page {props.mode} {String(props.isMasterDefault)}
  </div>
));
jest.mock("../../../src/admin/pages/Offerings/SessionTypesMainPage.jsx", () => {
  const { Outlet } = require("react-router-dom");
  return function MockOfferings() {
    return (
      <div>
        Offerings Layout
        <Outlet />
      </div>
    );
  };
});

const renderAtRoute = (route) => {
  window.history.pushState({}, "", route);
  return render(<App />);
};

describe("App", () => {
  test("renders shared layout components", () => {
    renderAtRoute("/");

    expect(screen.getByText("AdminNotificationToast Mock")).toBeInTheDocument();
    expect(screen.getByText("IdleLogout Mock")).toBeInTheDocument();
    expect(screen.getByText("Navbar Mock")).toBeInTheDocument();
    expect(screen.getByText("Footer Mock")).toBeInTheDocument();
  });

  test("renders home page on default route", () => {
    renderAtRoute("/");
    expect(screen.getByText("Home Page")).toBeInTheDocument();
  });

  test("renders about page", () => {
    renderAtRoute("/about");
    expect(screen.getByText("About Page")).toBeInTheDocument();
  });

  test("renders testimonials page", () => {
    renderAtRoute("/testimonials");
    expect(screen.getByText("Testimonials Page")).toBeInTheDocument();
  });

  test("renders portfolio page", () => {
    renderAtRoute("/portfolio");
    expect(screen.getByText("Portfolio Page")).toBeInTheDocument();
  });

  test("renders signup page", () => {
    renderAtRoute("/signup");
    expect(screen.getByText("SignUp Page")).toBeInTheDocument();
  });

  test("renders signup success page", () => {
    renderAtRoute("/signup/success");
    expect(screen.getByText("SignUp Success Page")).toBeInTheDocument();
  });

  test("renders login page", () => {
    renderAtRoute("/login");
    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });

  test("renders auth callback page", () => {
    renderAtRoute("/auth/callback");
    expect(screen.getByText("Auth Callback Page")).toBeInTheDocument();
  });

  test("renders services index page", () => {
    renderAtRoute("/services");
    expect(screen.getByText("Services Page")).toBeInTheDocument();
  });

  test("renders weddings page", () => {
    renderAtRoute("/services/weddings");
    expect(screen.getByText("Weddings Page")).toBeInTheDocument();
  });

  test("renders labor and delivery page", () => {
    renderAtRoute("/services/labor-and-delivery");
    expect(screen.getByText("Labor Page")).toBeInTheDocument();
  });

  test("renders protected dashboard index route", () => {
    renderAtRoute("/dashboard");
    expect(screen.getByText("ProtectedRoute Mock")).toBeInTheDocument();
    expect(screen.getByText("Client Dashboard Page")).toBeInTheDocument();
  });

  test("renders protected dashboard contracts route", () => {
    renderAtRoute("/dashboard/contracts");
    expect(screen.getByText("ProtectedRoute Mock")).toBeInTheDocument();
    expect(screen.getByText("Contracts Page")).toBeInTheDocument();
  });

  test("renders protected dashboard contract detail route", () => {
    renderAtRoute("/dashboard/contracts/123");
    expect(screen.getByText("ProtectedRoute Mock")).toBeInTheDocument();
    expect(screen.getByText("Contract View Page")).toBeInTheDocument();
  });

  test("renders protected dashboard inquiry route", () => {
    renderAtRoute("/dashboard/inquiry");
    expect(screen.getByText("ProtectedRoute Mock")).toBeInTheDocument();
    expect(screen.getByText("Inquiry Page")).toBeInTheDocument();
  });

  test("renders protected dashboard inquiry success route", () => {
    renderAtRoute("/dashboard/inquiry/success");
    expect(screen.getByText("ProtectedRoute Mock")).toBeInTheDocument();
    expect(screen.getByText("Inquiry Success Page")).toBeInTheDocument();
  });

  test("renders protected admin home route", () => {
    renderAtRoute("/admin");
    expect(screen.getByText("AdminRoute Mock")).toBeInTheDocument();
    expect(screen.getByText("Admin Home Page")).toBeInTheDocument();
  });

  test("renders admin sessions route", () => {
    renderAtRoute("/admin/sessions");
    expect(screen.getByText("AdminRoute Mock")).toBeInTheDocument();
    expect(screen.getByText("Sessions Page")).toBeInTheDocument();
  });

  test("renders admin availability route", () => {
    renderAtRoute("/admin/availability");
    expect(screen.getByText("AdminRoute Mock")).toBeInTheDocument();
    expect(screen.getByText("Availability Page")).toBeInTheDocument();
  });

  test("renders admin contacts route", () => {
    renderAtRoute("/admin/contacts");
    expect(screen.getByText("AdminRoute Mock")).toBeInTheDocument();
    expect(screen.getByText("Contacts Page")).toBeInTheDocument();
  });

  test("renders admin contact detail route", () => {
    renderAtRoute("/admin/contacts/123");
    expect(screen.getByText("AdminRoute Mock")).toBeInTheDocument();
    expect(screen.getByText("Contact View Page")).toBeInTheDocument();
  });

  test("renders admin contract detail route", () => {
    renderAtRoute("/admin/contracts/55");
    expect(screen.getByText("AdminRoute Mock")).toBeInTheDocument();
    expect(screen.getByText("Admin Contract View Page")).toBeInTheDocument();
  });

  test("renders admin galleries route", () => {
    renderAtRoute("/admin/galleries");
    expect(screen.getByText("Galleries Page")).toBeInTheDocument();
  });

  test("renders admin notifications route", () => {
    renderAtRoute("/admin/notifications");
    expect(screen.getByText("Notifications Page")).toBeInTheDocument();
  });

  test("renders admin payments route", () => {
    renderAtRoute("/admin/payments");
    expect(screen.getByText("Payments Page")).toBeInTheDocument();
  });

  test("renders admin forms index route", () => {
    renderAtRoute("/admin/forms");
    expect(screen.getByText("Forms Page")).toBeInTheDocument();
  });

  test("renders admin questionnaire create route", () => {
    renderAtRoute("/admin/forms/questionnaires/new");
    expect(screen.queryByText(/SessionTypeEditor Page/i)).not.toBeInTheDocument();
    expect(screen.getByText("Questionnaire Editor Page")).toBeInTheDocument();
  });

  test("renders admin questionnaire edit route", () => {
    renderAtRoute("/admin/forms/questionnaires/99/edit");
    expect(screen.getByText("Questionnaire Editor Page")).toBeInTheDocument();
  });

  test("renders admin contract create route", () => {
    renderAtRoute("/admin/forms/contracts/new");
    expect(screen.getByText("Contract Editor Page")).toBeInTheDocument();
  });

  test("renders admin contract edit route", () => {
    renderAtRoute("/admin/forms/contracts/77/edit");
    expect(screen.getByText("Contract Editor Page")).toBeInTheDocument();
  });

  test("renders admin settings route", () => {
    renderAtRoute("/admin/settings");
    expect(screen.getByText("Settings Page")).toBeInTheDocument();
  });

  test("renders admin offerings index route", () => {
    renderAtRoute("/admin/offerings");
    expect(screen.getByText("Offerings Layout")).toBeInTheDocument();
    expect(screen.getByText("Offerings Page")).toBeInTheDocument();
  });

  test("renders admin offerings new category route", () => {
    renderAtRoute("/admin/offerings/new");
    expect(screen.getByText("Offerings Layout")).toBeInTheDocument();
    expect(screen.getByText(/SessionTypeEditor Page create true/i)).toBeInTheDocument();
  });

  test("renders admin offerings edit route", () => {
    renderAtRoute("/admin/offerings/10/edit");
    expect(screen.getByText("Offerings Layout")).toBeInTheDocument();
    expect(screen.getByText(/SessionTypeEditor Page edit undefined/i)).toBeInTheDocument();
  });

  test("renders admin offerings child session type create route", () => {
    renderAtRoute("/admin/offerings/weddings/session-types/new");
    expect(screen.getByText("Offerings Layout")).toBeInTheDocument();
    expect(screen.getByText(/SessionTypeEditor Page create false/i)).toBeInTheDocument();
  });
});