import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import axios from "axios";

// Configure all API requests to prefix with /api so they get caught by Vite's proxy tunnel
axios.defaults.baseURL = "/api";

createRoot(document.getElementById("root")!).render(<App />);
