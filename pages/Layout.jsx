
import React from "react";
import { User } from "@/api/entities";
import { Project } from "@/api/entities";
import LeftPanel from "./components/shared/LeftPanel";
import AppHeader from "./components/shared/AppHeader";

// Define public pages that should not trigger authentication
const PUBLIC_PAGES = ['LandingPage'];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = React.useState(undefined);
  const [showLeftPanel, setShowLeftPanel] = React.useState(false);

  const isPublicPage = PUBLIC_PAGES.includes(currentPageName);

  React.useEffect(() => {
    // If it's a public page, do nothing. The user state remains undefined,
    // and the public page will be rendered directly.
    if (isPublicPage) {
      setUser(null); // Explicitly set user to null for public pages
      return;
    }

    // For private pages, proceed with authentication check
    const checkAuth = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser); // Set the user if authenticated
      } catch (error) {
        setUser(null); // Set user to null if not authenticated
      }
    };
    checkAuth();
  }, [currentPageName, isPublicPage]);

  React.useEffect(() => {
    const handleToggleLeftPanel = () => setShowLeftPanel(prev => !prev);
    window.addEventListener('toggleLeftPanel', handleToggleLeftPanel);
    return () => {
      window.removeEventListener('toggleLeftPanel', handleToggleLeftPanel);
    };
  }, []);

  // --- Rendering Logic ---

  // 1. If it's a public page, render its content directly without any layout.
  if (isPublicPage) {
    return <>{children}</>;
  }

  // 2. While checking authentication on a private page, show a loading indicator.
  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-16 h-16 border-4 border-gray-600 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // 3. If authentication check is complete and there's no user, redirect to login.
  if (!user) {
    User.login();
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-16 h-16 border-4 border-gray-600 border-t-purple-500 rounded-full animate-spin"></div>
        <p className="text-gray-300 font-medium ml-4">Redirecting to login...</p>
      </div>
    );
  }
  
  // 4. If user is authenticated, show the full application layout.
  return (
    <div className="min-h-screen bg-background text-foreground">
      <style>
        {`
          @layer base {
            :root {
              --background: 222.2 84% 4.9%;
              --foreground: 210 40% 98%;
              --card: 222.2 84% 4.9%;
              --card-foreground: 210 40% 98%;
              --popover: 222.2 84% 4.9%;
              --popover-foreground: 210 40% 98%;
              --primary: 263.4 70% 50.4%;
              --primary-foreground: 210 40% 98%;
              --secondary: 217.2 32.6% 17.5%;
              --secondary-foreground: 210 40% 98%;
              --muted: 217.2 32.6% 17.5%;
              --muted-foreground: 215 20.2% 65.1%;
              --accent: 217.2 32.6% 17.5%;
              --accent-foreground: 210 40% 98%;
              --destructive: 0 62.8% 30.6%;
              --destructive-foreground: 210 40% 98%;
              --border: 217.2 32.6% 17.5%;
              --input: 217.2 32.6% 17.5%;
              --ring: 263.4 70% 50.4%;
              --radius: 0.75rem;
            }
          }
        `}
      </style>
      <AppHeader user={user} />
      <main>
        {children}
      </main>
      {showLeftPanel && <LeftPanel user={user} onClose={() => setShowLeftPanel(false)} />}
    </div>
  );
}
