import { useCallback, useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Layout } from "@/components/Layout";
import NotFound from "@/pages/not-found";
import { Login } from "@/pages/Login";
import { apiFetch } from "@/lib/api-client";

import { Dashboard } from "@/pages/Dashboard";
import { Panduan } from "@/pages/Panduan";
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
        <Route path="/dashboard">
          <Redirect to="/" />
        </Route>
        <Route path="/panduan" component={Panduan} />
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

type AuthState = {
  status: "checking" | "authenticated" | "anonymous";
  loginConfigured: boolean;
};

function LoadingScreen() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-background">
      <img src="/websensial-logo.png" alt="Websensial" className="h-14 w-14 rounded-xl object-contain" />
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      <span className="text-xs text-muted-foreground">Memeriksa sesi…</span>
    </div>
  );
}

function App() {
  const [auth, setAuth] = useState<AuthState>({
    status: "checking",
    loginConfigured: true,
  });

  const checkSession = useCallback(async () => {
    try {
      const res = await apiFetch("/api/auth/session");
      const json = (await res.json()) as {
        authenticated?: unknown;
        loginConfigured?: unknown;
      };
      setAuth({
        status: json.authenticated ? "authenticated" : "anonymous",
        loginConfigured: json.loginConfigured !== false,
      });
    } catch {
      setAuth({ status: "anonymous", loginConfigured: true });
    }
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {auth.status === "checking" ? (
            <LoadingScreen />
          ) : auth.status === "anonymous" ? (
            <Login
              loginConfigured={auth.loginConfigured}
              onSuccess={() => {
                queryClient.clear();
                void checkSession();
              }}
            />
          ) : (
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
          )}
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
