import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Header } from "../components/Header";
import { CursorGlow } from "../components/CursorGlow";
import { Toaster } from "sonner";
import { AuthProvider } from "../lib/auth-context";
import { AgeGate } from "../components/AgeGate";
import { SiteSettingsProvider } from "../lib/site-settings";
import { BanGate } from "../components/BanGate";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center glass p-10">
        <h1 className="text-7xl font-horror text-primary red-glow-lg">404</h1>
        <h2 className="mt-4 text-xl font-horror">Lost in the leak</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This box doesn't exist or has been redacted.
        </p>
        <div className="mt-6">
          <Link to="/" className="btn-red">Return home</Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center glass p-10">
        <h1 className="text-2xl font-horror text-primary red-glow">Signal lost</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something corrupted this page. Try again or head back.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="btn-red">Try again</button>
          <a href="/" className="btn-ghost">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "BoxLeak — Browse boxes" },
      { name: "description", content: "BoxLeak Central is a website for discovering and sharing community-created \"boxes\" of information." },
      { property: "og:title", content: "BoxLeak — Browse boxes" },
      { property: "og:description", content: "BoxLeak Central is a website for discovering and sharing community-created \"boxes\" of information." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "BoxLeak — Browse boxes" },
      { name: "twitter:description", content: "BoxLeak Central is a website for discovering and sharing community-created \"boxes\" of information." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/sQWwO5mem4OGLWmWqFgYlTArcmy1/social-images/social-1785097176129-HD-wallpaper-plain-black-black.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/sQWwO5mem4OGLWmWqFgYlTArcmy1/social-images/social-1785097176129-HD-wallpaper-plain-black-black.webp" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Creepster&family=Nosifer&family=Inter:wght@400;500;600;700&display=swap" },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <SiteSettingsProvider>
      <AuthProvider>
        <div className="leak-bg" />
        <div className="leak-noise" />
        <CursorGlow />
        <div className="relative min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 relative z-[2]">
            <Outlet />
          </main>
          <footer className="text-center text-xs text-muted-foreground py-6 relative z-[2]">
            LeakBox — community leaks, verified by @leak
          </footer>
        </div>
        <Toaster theme="dark" position="top-right" richColors />
        <AgeGate />
        <BanGate />
      </AuthProvider>
      </SiteSettingsProvider>
    </QueryClientProvider>
  );
}
