import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import HomePage from "./pages/HomePage";
import EventPage from "./pages/EventPage";
import PredictionsPage from "./pages/PredictionsPage";
import DraftPage from "./pages/DraftPage";
import ComplementPage from "./pages/ComplementPage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <header className="border-b border-gray-800 bg-gray-900">
          <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-4">
            <Link to="/" className="text-xl font-bold text-blue-400">
              FRC Alliance Scout
            </Link>
            <nav className="flex gap-4 text-sm text-gray-400">
              <Link to="/" className="hover:text-gray-200">
                Events
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/event/:eventKey" element={<EventPage />} />
            <Route
              path="/event/:eventKey/predictions"
              element={<PredictionsPage />}
            />
            <Route path="/event/:eventKey/draft" element={<DraftPage />} />
            <Route
              path="/event/:eventKey/complement/:teamKey"
              element={<ComplementPage />}
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
