import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import NotFound from "@/pages/not-found";

import { Dashboard } from "@/pages/Dashboard";
import { Prospects } from "@/pages/Prospects";
import { ProspectDetail } from "@/pages/ProspectDetail";
import { Pipeline } from "@/pages/Pipeline";
import { Templates } from "@/pages/Templates";
import { Invoices } from "@/pages/Invoices";
import { Packages } from "@/pages/Packages";
import { Settings } from "@/pages/Settings";
import { Prospecting } from "@/pages/Prospecting";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/prospecting" component={Prospecting} />
        <Route path="/prospects" component={Prospects} />
        <Route path="/prospects/:id" component={ProspectDetail} />
        <Route path="/pipeline" component={Pipeline} />
        <Route path="/templates" component={Templates} />
        <Route path="/invoices" component={Invoices} />
        <Route path="/packages" component={Packages} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
