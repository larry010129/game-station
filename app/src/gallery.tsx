import { createRoot } from "react-dom/client";
import "@fontsource/outfit/200.css";
import "@fontsource/outfit/300.css";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "./styles/app.css";
import "./styles/meta.css";
import { CardGallery } from "./components/CardGallery";

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<CardGallery />);
}
