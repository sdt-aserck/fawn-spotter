import { Link } from "react-router-dom";
import "./App.css";
import staffGif from "./assets/gifs/staff.gif";
import activitiesGif from "./assets/gifs/activities.gif";
import sharedGif from "./assets/gifs/shared_experience.gif";
import scheduleGif from "./assets/gifs/schedule.gif";
import timeslotGif from "./assets/gifs/timeslot.gif";
import fortuneGif from "./assets/gifs/fortune.gif";

const pages = [
  { title: "Staff", to: "/staff", gif: staffGif },
  { title: "Activities", to: "/activities", gif: activitiesGif },
  { title: "Shared Experience", to: "/shared-experience", gif: sharedGif },
  { title: "Scheduling", to: null, gif: scheduleGif },
  { title: "Timeslots", to: "/timeslots", gif: timeslotGif },
  { title: "Fortune Teller", to: null, gif: fortuneGif },
];

function App() {
  return (
    <div className="page">
      <header className="site-header">
        <marquee>★ Welcome to Fawn Spotter ★ Your Camp Management HQ ★ Est. 2025 ★</marquee>
        <h1 className="site-title">🏕️ Fawn Spotter 🏕️</h1>
        <p className="site-subtitle">Camp Management System</p>
        <hr className="divider" />
      </header>

      <main>
        <p className="nav-prompt">[ Choose a section ]</p>
        <div className="grid">
          {pages.map((page) =>
            page.to ? (
              <Link key={page.title} to={page.to} className="grid-cell">
                <div className="cell-title">{page.title}</div>
                <img src={page.gif} alt={page.title} className="cell-gif" />
              </Link>
            ) : (
              <div key={page.title} className="grid-cell">
                <div className="cell-title">{page.title}</div>
                <img src={page.gif} alt={page.title} className="cell-gif" />
              </div>
            )
          )}
        </div>
      </main>

      <footer className="site-footer">
        <hr className="divider" />
        <p>🌲 Fawn Spotter Camp Management 🌲</p>
      </footer>
    </div>
  );
}

export default App;
