import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import SurahDetail from './pages/SurahDetail';
import MushafPage from './pages/MushafPage';
import MushafFlipbook from './pages/MushafFlipbook';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/surah/:number" element={<SurahDetail />} />
          <Route path="/page/:pageNumber" element={<MushafPage />} />
          <Route path="/mushaf" element={<MushafFlipbook />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
