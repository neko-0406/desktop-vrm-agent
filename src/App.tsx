import { useEffect, useState } from "react";
import "./App.css";
import { VrmViewer } from "./components/VrmViewer";

function App() {
  const [vrmUrl, setVrmUrl] = useState<string | null>(null);
  const [vrmaUrl, setVrmaUrl] = useState<string | null>(null);

  useEffect(() => {
    setVrmUrl("/avatar.vrm");
    setVrmaUrl("/avatar.vrma");
  }, []);

  return (
    <main className="app-main">
      <VrmViewer vrmUrl={vrmUrl} vrmaUrl={vrmaUrl} />
    </main>
  );
}

export default App;
