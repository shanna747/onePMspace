import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChatMessage } from '@/api/entities';
import { InvokeLLM } from '@/api/integrations';
import { Loader2, MessageCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border p-2 rounded-lg shadow-lg">
        <p className="font-bold text-foreground">{`${label}`}</p>
        <p className="text-sm" style={{ color: payload[0].fill }}>{`Questions: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

export default function AITopicsGraph({ project }) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const analyzeAITopics = useCallback(async () => {
    console.log("📊 Starting AI topic analysis for project:", project.id);
    setLoading(true);
    setError(null);

    try {
      // Fetch all messages marked as 'ai_assistant' for this project, regardless of sender.
      const messages = await ChatMessage.filter({
        project_id: project.id,
        message_type: 'ai_assistant'
      }, '-created_date', 100);

      console.log(`📊 Found ${messages.length} AI assistant-related messages.`);

      // Isolate only the questions asked by the user.
      const userQuestions = messages
        .filter(m => m.message && m.message.startsWith('USER:'))
        .map(m => m.message.replace('USER: ', ''));

      console.log(`📊 Extracted ${userQuestions.length} user questions for analysis.`);

      if (userQuestions.length === 0) {
        setTopics([]);
        setLoading(false);
        return;
      }

      const allQuestionsText = userQuestions.join('\n');
      
      const analysis = await InvokeLLM({
        prompt: `Analyze the following client questions for the project "${project.name}" and categorize them into a maximum of 5 topics and their frequency.

Client Questions:
---
${allQuestionsText}
---

Your response must be only a JSON object with a single key "topics", containing an array of objects. Each object in the array should have two keys: "topic" (a string) and "count" (a number). Example: {"topics": [{"topic": "Timeline", "count": 3}, {"topic": "Billing", "count": 1}]}`,
        response_json_schema: {
          type: "object",
          properties: {
            topics: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  topic: { type: "string" },
                  count: { type: "number" }
                },
                required: ["topic", "count"]
              }
            }
          },
          required: ["topics"],
        },
      });

      if (analysis && analysis.topics) {
        console.log("📊 Analysis successful. Topics found:", analysis.topics);
        setTopics(analysis.topics);
      } else {
        throw new Error("AI analysis did not return topics in the expected format.");
      }

    } catch (e) {
      console.error("📊 Error during AI topic analysis:", e);
      setError("Failed to analyze topics. Please try again.");
      setTopics([]);
    } finally {
      setLoading(false);
    }
  }, [project?.id, project?.name]);

  useEffect(() => {
    analyzeAITopics();
  }, [analyzeAITopics]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="h-48 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span>Analyzing AI topics...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="h-48 flex flex-col items-center justify-center text-center text-destructive">
          <AlertCircle className="w-8 h-8 mb-2" />
          <p className="font-semibold">{error}</p>
        </div>
      );
    }
    
    if (topics.length === 0) {
      return (
        <div className="h-48 flex flex-col items-center justify-center text-center text-muted-foreground">
          <MessageCircle className="w-8 h-8 mb-2" />
          <p className="font-semibold">No AI Assistant Topics</p>
          <p className="text-sm">Topics from client AI chats will appear here.</p>
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={topics}
          margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
          <XAxis dataKey="topic" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--secondary))' }} />
          <Bar dataKey="count" fill={project?.accent_color || '#8884d8'} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              AI Assistant Topics
            </CardTitle>
            <CardDescription>
              Topics discussed when clients use the AI Assistant.
            </CardDescription>
          </div>
          <Button 
            onClick={analyzeAITopics} 
            variant="outline" 
            size="sm" 
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analyzing...' : 'Refresh Analysis'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          {renderContent()}
        </div>
      </CardContent>
    </Card>
  );
}