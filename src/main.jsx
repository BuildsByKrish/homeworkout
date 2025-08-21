import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // Corrected: changed .js to .jsx
import './index.css'; // Assuming you might have a global CSS file, if not, you can remove this line

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
