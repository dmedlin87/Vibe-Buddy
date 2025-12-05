
import React from 'react';
import { AppProvider } from './store';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Layout />
      </AppProvider>
    </ErrorBoundary>
  );
};

export default App;
