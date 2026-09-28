import React, { useState } from 'react';
import { DatasetProvider } from './context/DatasetContext';
import { SmoothScrollWrapper, Footer } from './components/layout/Footer';
import { Navbar } from './components/layout/Navbar';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';

export default function App() {
  // A shareable dashboard link (?dataset=...&state=...) should land directly
  // on the dashboard rather than the landing page.
  const [currentPage, setCurrentPage] = useState(() =>
    new URLSearchParams(window.location.search).has('dataset') ? 'dashboard' : 'landing'
  ); // 'landing' | 'dashboard'

  return (
    <DatasetProvider>
      <SmoothScrollWrapper lenisEnabled={currentPage === 'landing'}>
        <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
        
        <main className="flex-1">
          {currentPage === 'landing' ? (
            <LandingPage setCurrentPage={setCurrentPage} />
          ) : (
            <DashboardPage onBackToHome={() => setCurrentPage('landing')} />
          )}
        </main>

        <Footer setCurrentPage={setCurrentPage} />
      </SmoothScrollWrapper>
    </DatasetProvider>
  );
}
