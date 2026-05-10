import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Deploy from "./pages/Deploy";
import Logbook from "./pages/Logbook";
import LogDive from "./pages/LogDive";
import DiveDetail from "./pages/DiveDetail";
import Profile from "./pages/Profile";
import DiveSites from "./pages/DiveSites";
import DiveTools from "./pages/DiveTools";
import Community from "./pages/Community";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/deploy" element={<Deploy />} />
        <Route path="/logbook" element={<Logbook />} />
        <Route path="/logbook/:id" element={<DiveDetail />} />
        <Route path="/log-dive" element={<LogDive />} />
        <Route path="/dive-sites" element={<DiveSites />} />
        <Route path="/tools" element={<DiveTools />} />
        <Route path="/community" element={<Community />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}
