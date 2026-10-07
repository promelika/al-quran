import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import SurahDetail from './pages/SurahDetail';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/surah/:number" element={<SurahDetail />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
