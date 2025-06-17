import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Terminal from "@/components/Terminal";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="w-full h-screen overflow-hidden">
        <Terminal />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;
