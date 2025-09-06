
import React, { useState, useEffect } from "react";
import { ResponseBotConfig } from "@/api/entities";
import { ChatMessage } from "@/api/entities";
import { InvokeLLM } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, User as UserIcon, Loader2 } from "lucide-react";

export default function ProjectBot({ project, user }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [botConfig, setBotConfig] = useState(null);

  useEffect(() => {
    const loadExistingMessages = async () => {
      try {
        console.log("🤖 Loading AI assistant messages for project:", project.id, "user:", user.id);
        
        // Load existing AI assistant messages for this project and user
        const existingMessages = await ChatMessage.filter({
          project_id: project.id,
          sender_id: user.id,
          message_type: 'ai_assistant'
        }, '-created_date'); // Order by created_date descending

        console.log("🤖 Found existing AI messages:", existingMessages.length);

        // Sort the messages to ensure they are in chronological order for display (oldest first)
        const sortedMessages = existingMessages.sort((a, b) => new Date(a.created_date).getTime() - new Date(b.created_date).getTime());

        if (sortedMessages.length > 0) {
          const formattedMessages = sortedMessages.map(msg => ({
            id: msg.id,
            type: msg.message.startsWith('AI:') ? 'bot' : 'user',
            content: msg.message.replace(/^(AI:|USER:)\s*/, ''), // Remove 'AI: ' or 'USER: ' prefix
            timestamp: msg.created_date
          }));
          setMessages(formattedMessages);
        } else {
          // Add welcome message only if no existing messages
          setMessages([
            {
              id: 'welcome',
              type: 'bot',
              content: `Hello! I'm your project assistant. I can help answer questions about your project, our services, and general support inquiries. How can I help you today?`,
              timestamp: new Date().toISOString()
            }
          ]);
        }
      } catch (error) {
        console.error("Error loading existing messages:", error);
        // Fallback to welcome message in case of error
        setMessages([
          {
            id: 'welcome',
            type: 'bot',
            content: `Hello! I'm your project assistant. How can I help you today?`,
            timestamp: new Date().toISOString()
          }
        ]);
      }
    };

    const loadBotConfig = async () => {
      try {
        const configs = await ResponseBotConfig.list();
        if (configs.length > 0) {
          setBotConfig(configs[0]);
        }
      } catch (error) {
        console.error("Error loading bot config:", error);
      }
    };

    loadBotConfig();
    loadExistingMessages();
  }, [project.id, user.id]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    
    console.log("🤖 Saving user message to database:", inputMessage);
    
    // Save user message to database for topic analysis
    try {
      const savedUserMessage = await ChatMessage.create({
        project_id: project.id,
        sender_id: user.id,
        message: `USER: ${inputMessage}`, // Prefix user message
        message_type: 'ai_assistant',
        timestamp: new Date().toISOString()
      });
      console.log("🤖 User message saved successfully:", savedUserMessage.id);
    } catch (error) {
      console.error("🤖 Error saving user message:", error);
      // Decide if you want to show a user-facing error here
    }

    const currentInput = inputMessage; // Capture current input before clearing
    setInputMessage("");
    setLoading(true);

    try {
      let prompt = `You are a helpful project support assistant. Answer the user's question professionally and helpfully.
      
User question: ${currentInput}

Project context:
- Project Name: ${project.name}
- Client: ${project.client_name}
- Description: ${project.description || 'No description available'}`;

      if (botConfig?.product_info) {
        prompt += `\n- Additional product info: ${botConfig.product_info}`;
      }

      if (botConfig?.knowledge_articles && botConfig.knowledge_articles.length > 0) {
        prompt += `\n\nKnowledge base articles that might be relevant:`;
        botConfig.knowledge_articles.forEach(article => {
          prompt += `\n- ${article.title}: ${article.summary}`;
        });
      }

      prompt += `\n\nProvide a helpful, professional response. If you don't have specific information, suggest they contact their project manager or support team.`;

      const response = await InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false
      });

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, botMessage]);

      console.log("🤖 Saving AI response to database:", response.substring(0, 50) + "...");

      // Save bot response to database
      try {
        const savedBotMessage = await ChatMessage.create({
          project_id: project.id,
          sender_id: user.id, // The message is "from" the user's perspective in this context
          message: `AI: ${response}`, // Prefix AI message
          message_type: 'ai_assistant',
          timestamp: new Date().toISOString()
        });
        console.log("🤖 AI response saved successfully:", savedBotMessage.id);
      } catch (error) {
        console.error("🤖 Error saving bot response:", error);
      }

    } catch (error) {
      console.error("Error getting bot response:", error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: "I apologize, but I'm having trouble responding right now. Please try again later or contact your project manager for assistance.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const isLongResponse = (content) => {
    return content.length > 500 || content.split('\n').length > 8;
  };

  return (
    <div className="p-1">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">AI Support Assistant</h2>
          <p className="text-muted-foreground">Ask questions about your project or get general support.</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Bot className="w-4 h-4" />
          Online
        </Badge>
      </div>

      <Card className="h-[600px] flex flex-col">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="w-5 h-5 text-primary" />
            Support Chat
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${
                  message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.type === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-secondary text-secondary-foreground'
                }`}>
                  {message.type === 'user' ? (
                    <UserIcon className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>
                
                <div className={`max-w-[70%] p-3 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-primary text-primary-foreground ml-auto'
                    : 'bg-secondary text-secondary-foreground'
                }`}>
                  {message.type === 'bot' && isLongResponse(message.content) ? (
                    <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/30 hover:scrollbar-thumb-muted-foreground/50 pr-2">
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                  <span className="text-xs opacity-70 mt-1 block">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-secondary text-secondary-foreground p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about your project..."
                className="flex-1"
                disabled={loading}
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || loading}
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Press Enter to send. The AI assistant can help with project questions and general support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
