import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import Layout from './components/Layout';
import EntityBrowser from './components/EntityBrowser';
import PrimaryKeyRuleBuilder from './components/PrimaryKeyRuleBuilder';
import FieldRuleEditor from './components/FieldRuleEditor';
import DataGeneration from './components/DataGeneration';
import GraphDataGeneration from './components/GraphDataGeneration';
import MasterDataManager from './components/MasterDataManager';
import ProcessDataGenerator from './components/ProcessDataGenerator';
import DataMigration from './components/DataMigration';
import EnumerationEvaluations from './components/EnumerationEvaluations';
import QualityChecks from './components/QualityChecks';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2196f3',
    },
    secondary: {
      main: '#f50057',
    },
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/entities" replace />} />
              <Route path="entities" element={<EntityBrowser />} />
              <Route path="pk-rules" element={<PrimaryKeyRuleBuilder />} />
              <Route path="field-rules" element={<FieldRuleEditor />} />
              <Route path="generate" element={<DataGeneration />} />
              <Route path="graph-generate" element={<GraphDataGeneration />} />
              <Route path="master-data" element={<MasterDataManager />} />
              <Route path="process-data" element={<ProcessDataGenerator />} />
              <Route path="data-migration" element={<DataMigration />} />
              <Route path="enumeration-evaluations" element={<EnumerationEvaluations />} />
              <Route path="quality-checks" element={<QualityChecks />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
