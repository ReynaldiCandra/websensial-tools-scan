import { createRoot } from "react-dom/client";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

// Generated hooks (@workspace/api-client-react) use their own fetch helper,
// which knows nothing about the API key. Without this every CRM page
// (Dashboard, Prospek, Pipeline, …) gets 401 in production, because the API
// requires an `x-api-key`/`Authorization` header on all non-health endpoints.
const apiKey = import.meta.env.VITE_API_KEY;
if (apiKey) setAuthTokenGetter(() => String(apiKey));

createRoot(document.getElementById("root")!).render(<App />);
