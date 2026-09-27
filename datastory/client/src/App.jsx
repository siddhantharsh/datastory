import React, { useState } from 'react';
import { DatasetProvider } from './context/DatasetContext';
import { SmoothScrollWrapper, Footer } from './components/layout/Footer';
import { Navbar } from './components/layout/Navbar';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';

export default function App() {
  const [currentPage, setCurrentPage] = useState('landing'); // 'landing' | 'dashboard'

  return (
    <DatasetProvider>
      <SmoothScrollWrapper>
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
