import { Providers } from "./components/providers";
import { DeveloperWorkspace } from "./components/ide/DeveloperWorkspace";

function App() {
  return (
    <Providers>
      <div className="h-screen w-screen relative overflow-hidden bg-cyber-bg flex flex-col">
        {/* Main IDE Workspace */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <DeveloperWorkspace />
        </div>
      </div>
    </Providers>
  );
}

export default App;
