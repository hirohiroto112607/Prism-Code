import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

console.log("🚀 Prism Code WebView starting...");
console.log("📍 Root element:", document.getElementById("root"));

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

console.log("✅ Prism Code WebView initialized");
