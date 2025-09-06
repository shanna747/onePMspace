import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Megaphone, Map, BookOpen, Youtube, DollarSign, Lightbulb } from 'lucide-react';

const newFeatures = [
  { title: "AI-Powered Timeline Generation", description: "Projects now start with an intelligent, pre-populated timeline based on project type.", date: "This Month" },
  { title: "Client Health Dashboard", description: "Proactively monitor client engagement and satisfaction with our new Health tab.", date: "This Month" },
  { title: "Dark Mode & Theming", description: "A complete UI overhaul with a sleek new dark mode and customizable project accent colors.", date: "Last Month" },
];

const roadmapItems = {
  'this-quarter': [{ title: "Granular User Permissions", description: "Fine-tune access for every feature within a project." }],
  'next-quarter': [{ title: "Deeper Google Drive Integration", description: "Two-way sync for files and documents." }, { title: "Time Tracking & Reporting", description: "Allow team members to log hours against timeline items." }],
  'following-quarter': [{ title: "Client Invoicing", description: "Generate and send invoices directly from the platform." }, { title: "Customizable Dashboards", description: "Build your own views with a widget-based system." }],
};

const videoTutorials = [
  { title: "5-Minute Project Setup", length: "5:21" },
  { title: "Mastering the Project Timeline", length: "8:45" },
  { title: "A Guide to Client Sign-offs", length: "4:10" },
];

const upsellOpportunities = [
  { title: "White-Glove Onboarding", description: "Offer a premium service where you fully set up and manage the client's first project." },
  { title: "Custom Branded Client Portal", description: "Provide a version of the client dashboard featuring their logo and brand colors." },
  { title: "API Access & Integrations", description: "For enterprise clients who want to connect the portal to their existing systems." },
];

const quarterLabels = {
  'this-quarter': 'This Quarter',
  'next-quarter': 'Next Quarter',
  'following-quarter': 'Following Quarter'
};

export default function ProductHub() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="icon" className="bg-purple-600 text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input hover:bg-accent hover:text-accent-foreground h-10 w-10">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Product Hub</h1>
            <p className="text-muted-foreground">Your central resource for all things product-related.</p>
          </div>
        </div>

        <div className="space-y-12">
          {/* New Product Features */}
          <Card className="glass-effect">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Megaphone className="w-6 h-6 text-purple-400" />
                <CardTitle className="text-stone-50">What's New?</CardTitle>
              </div>
              <CardDescription className="text-muted-foreground">The latest features and improvements to the platform.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {newFeatures.map((feature, index) => (
                <Card key={index} className="bg-slate-900 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-base text-stone-50">{feature.title}</CardTitle>
                    <CardDescription>{feature.date}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-300">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>

          {/* Roadmap */}
          <Card className="glass-effect">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Map className="w-6 h-6 text-blue-400" />
                <CardTitle className="text-stone-50">Product Roadmap</CardTitle>
              </div>
              <CardDescription className="text-muted-foreground">A look at what we're building now, next, and in the future.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(roadmapItems).map(([key, items]) => (
                <div key={key} className="bg-slate-900 rounded-lg p-4">
                  <h3 className="font-bold text-lg mb-4 text-center text-stone-50">{quarterLabels[key]}</h3>
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div key={index} className="p-3 bg-slate-800 rounded-md">
                        <p className="font-semibold text-sm text-stone-50">{item.title}</p>
                        <p className="text-xs text-slate-400">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Upsell Opportunities */}
          <Card className="glass-effect">
            <CardHeader>
              <div className="flex items-center gap-3">
                <DollarSign className="w-6 h-6 text-yellow-400" />
                <CardTitle className="text-stone-50">Upsell & Growth Opportunities</CardTitle>
              </div>
              <CardDescription className="text-muted-foreground">Ideas for expanding client relationships and adding value.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upsellOpportunities.map((opp, index) => (
                <div key={index} className="p-4 rounded-lg bg-slate-900 border border-slate-700">
                  <div className="flex items-center gap-3 mb-2">
                    <Lightbulb className="w-5 h-5 text-yellow-400" />
                    <h4 className="font-semibold text-base text-stone-50">{opp.title}</h4>
                  </div>
                  <p className="text-sm text-slate-300">{opp.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Documentation & Updates */}
          <div className="grid grid-cols-1 gap-12">
            <Card className="glass-effect">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Youtube className="w-6 h-6 text-red-400" />
                  <CardTitle className="text-stone-50">Product Updates</CardTitle>
                </div>
                <CardDescription className="text-muted-foreground">Quick guides to get you and your clients up to speed.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {videoTutorials.map((video, index) => (
                  <div key={index} className="flex items-center p-3 rounded-lg hover:bg-white/5 transition-colors">
                    <Youtube className="w-4 h-4 mr-3 text-slate-400" />
                    <span className="flex-1 text-sm font-medium text-stone-50">{video.title}</span>
                    <span className="text-xs text-slate-400">{video.length}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}