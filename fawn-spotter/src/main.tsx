import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import StaffPage from "./pages/StaffPage";
import ActivitiesPage from "./pages/ActivitiesPage";
import SharedExperiencePage from "./pages/SharedExperiencePage";
import TimeSlotsPage from "./pages/TimeSlotsPage";
import SchedulingPage from "./pages/SchedulingPage";
import WeekDetailPage from "./pages/WeekDetailPage";
import ScheduleDetailPage from "./pages/ScheduleDetailPage";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/staff" element={<StaffPage />} />
        <Route path="/activities" element={<ActivitiesPage />} />
        <Route path="/shared-experience" element={<SharedExperiencePage />} />
        <Route path="/timeslots" element={<TimeSlotsPage />} />
        <Route path="/scheduling" element={<SchedulingPage />} />
        <Route path="/scheduling/:weekId" element={<WeekDetailPage />} />
        <Route path="/scheduling/schedule/:scheduleId" element={<ScheduleDetailPage />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>,
);
