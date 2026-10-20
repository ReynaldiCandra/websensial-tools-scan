import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Layout } from "@/components/Layout";
import { Login } from "@/pages/Login";
import { apiFetch } from "@/lib/api-client";

const Dashboard = lazy(() => import("@/pages/Dashboard").then((module) => ({ default: module.Dashboard })));
const Panduan = lazy(() => import("@/pages/Panduan").then((module) => ({ default: module.Panduan })));
const Prospects = lazy(() => import("@/pages/Prospects").then((module) => ({ default: module.Prospects })));
const ProspectDetail = lazy(() => import("@/pages/ProspectDetail").then((module) => ({ default: module.ProspectDetail })));
const Pipeline = lazy(() => import("@/pages/Pipeline").then((module) => ({ default: module.Pipeline })));
const Templates = lazy(() => import("@/pages/Templates").then((module) => ({ default: module.Templates })));
const Invoices = lazy(() => import("@/pages/Invoices").then((module) => ({ default: module.Invoices })));
const Packages = lazy(() => import("@/pages/Packages").then((module) => ({ default: module.Packages })));
const Settings = lazy(() => import("@/pages/Settings").then((module) => ({ default: module.Settings })));
const Prospecting = lazy(() => import("@/pages/Prospecting").then((module) => ({ default: module.Prospecting })));
const NotFound = lazy(() => import("@/pages/not-found"));

function RouteLoading() {
  return (
    <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
      <Loader2 className="h-4 w-4 animate-spin" />
      Memuat halaman…
    </div>
  );
}

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Suspense fallback={<RouteLoading />}>
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
      </Suspense>
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
