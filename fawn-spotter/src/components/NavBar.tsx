import { Link } from "react-router-dom";
import "./NavBar.css";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "Staff", to: "/staff" },
  { label: "Activities", to: "/activities" },
  { label: "Shared Experience", to: "/shared-experience" },
  { label: "Scheduling", to: "/scheduling" },
  { label: "Timeslots", to: "/timeslots" },
  { label: "Fortune Teller", to: "/fortune-teller" },
];

function NavBar() {
  return (
    <nav className="navbar">
      {navLinks.map((link) => (
        <Link key={link.to} to={link.to} className="navbar-link">
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export default NavBar;
