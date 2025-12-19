import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
// 注意：必须关闭 StrictMode 才能让 @hello-pangea/dnd 正常工作，避免双重挂载导致的 Context 丢失
root.render(
  <App />
);