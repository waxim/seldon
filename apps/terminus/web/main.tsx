import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@seldon/ui/tokens.css";
import "./app.css";
import { App } from "./App.js";

const root = document.getElementById("root");
if (!root) throw new Error("Terminus has no mount point");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
