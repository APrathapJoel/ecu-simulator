import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import axios from "axios";

// Configure API requests to prefix with /api or target VITE_API_HOST directly in production
const apiHost = import.meta.env.VITE_API_HOST;
axios.defaults.baseURL = apiHost ? `https://${apiHost}/api` : "/api";
// Required for cross-origin session cookies (Render: dashboard ↔ api-server)
axios.defaults.withCredentials = true;

createRoot(document.getElementById("root")!).render(<App />);

