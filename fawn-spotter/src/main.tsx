import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import StaffPage from "./pages/StaffPage";
import ActivitiesPage from "./pages/ActivitiesPage";
import SharedExperiencePage from "./pages/SharedExperiencePage";
import TimeSlotsPage from "./pages/TimeSlotsPage";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/staff" element={<StaffPage />} />
        <Route path="/activities" element={<ActivitiesPage />} />
        <Route path="/shared-experience" element={<SharedExperiencePage />} />
        <Route path="/timeslots" element={<TimeSlotsPage />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>,
);
