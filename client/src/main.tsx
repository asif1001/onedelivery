import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add error boundary for production debugging
try {
  console.log("Starting OILDELIVERY app initialization...");
  const rootElement = document.getElementById("root");
  
  if (!rootElement) {
    throw new Error("Root element not found");
  }
  
  console.log("Root element found, creating React app...");
  createRoot(rootElement).render(<App />);
  console.log("React app rendered successfully");
} catch (error) {
  console.error("App initialization failed:", error);
  
  // Fallback error display
  document.body.innerHTML = `
    <div style="
      min-height: 100vh; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      background: linear-gradient(to bottom right, #f59e0b, #ea580c);
      font-family: system-ui, -apple-system, sans-serif;
    ">
      <div style="
        background: white; 
        padding: 2rem; 
        border-radius: 0.5rem; 
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        text-align: center;
        max-width: 400px;
      ">
        <h1 style="color: #dc2626; margin: 0 0 1rem 0;">OILDELIVERY</h1>
        <p style="color: #374151; margin: 0 0 1rem 0;">
          App is loading... If this persists, please contact support.
        </p>
        <p style="color: #6b7280; font-size: 0.875rem; margin: 0;">
          Error: ${(error as Error).message}
        </p>
      </div>
    </div>
  `;
}
