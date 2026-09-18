import React from 'react';
import ReactDOM from 'react-dom/client';
import { pdfjs } from 'react-pdf';
import App from './App';
import { ThemeProvider } from './ThemeContext';
import 'katex/dist/katex.min.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
