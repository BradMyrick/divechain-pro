import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";

const Deploy = lazy(() => import("./pages/Deploy"));
const Logbook = lazy(() => import("./pages/Logbook"));
const LogDive = lazy(() => import("./pages/LogDive"));
const ImportDives = lazy(() => import("./pages/ImportDives"));
const DiveDetail = lazy(() => import("./pages/DiveDetail"));
const Profile = lazy(() => import("./pages/Profile"));
const DiveSites = lazy(() => import("./pages/DiveSites"));
const DiveTools = lazy(() => import("./pages/DiveTools"));
const Community = lazy(() => import("./pages/Community"));
const Attest = lazy(() => import("./pages/Attest"));
const PublicDiver = lazy(() => import("./pages/PublicDiver"));
const Demo = lazy(() => import("./pages/Demo"));
const About = lazy(() => import("./pages/About"));

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm opacity-60">
      Loading…
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/deploy" element={<Deploy />} />
          <Route path="/logbook" element={<Logbook />} />
          <Route path="/logbook/:id" element={<DiveDetail />} />
          <Route path="/log-dive" element={<LogDive />} />
          <Route path="/import" element={<ImportDives />} />
          <Route path="/attest" element={<Attest />} />
          <Route path="/dive-sites" element={<DiveSites />} />
          <Route path="/tools" element={<DiveTools />} />
          <Route path="/community" element={<Community />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/diver/:ref" element={<PublicDiver />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
