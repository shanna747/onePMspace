import React from 'react';
import { User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';

export default function LandingPage() {
  const handleLogin = () => {
    User.login();
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <style>
        {`
          .gradient-text {
            background: -webkit-linear-gradient(45deg, #A770EF, #CF8BF3, #FDB99B);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .hero-bg {
            background-image: radial-gradient(circle at 20% 80%, rgba(130, 0, 255, 0.1), transparent 30%), 
                              radial-gradient(circle at 80% 30%, rgba(100, 100, 255, 0.1), transparent 30%);
          }
        `}
      </style>
      <div className="relative isolate px-6 pt-14 lg:px-8 hero-bg">
        <div className="mx-auto max-w-4xl py-32 sm:py-48 lg:py-56">
          <div className="text-center">
            <img src="https://i.imgur.com/k9u1k0a.png" alt="One PM Space Logo" className="w-24 h-24 mx-auto mb-8 rounded-2xl shadow-lg" />
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              The Single Source of Truth for <span className="gradient-text">Client Projects</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Stop juggling between emails, chats, and spreadsheets. One PM Space consolidates all your client communication, project timelines, file sharing, and sign-offs into one collaborative dashboard.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button onClick={handleLogin} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6 rounded-full">
                <LogIn className="mr-3 h-5 w-5" />
                Access Your Portal
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}