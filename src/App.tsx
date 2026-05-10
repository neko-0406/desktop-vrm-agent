import { useEffect, useState } from "react";
import "./App.css";
import { VrmViewer } from "./components/VrmViewer";

function App() {
  const [vrmUrl, setVrmUrl] = useState<string | null>(null);

  useEffect(() => {
    setVrmUrl("/avatar.vrm");
  }, []);

  return (
    <main className="app-main">
      <VrmViewer vrmUrl={vrmUrl} />
    </main>
  );
}

export default App;
