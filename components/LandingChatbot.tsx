import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles, HelpCircle } from 'lucide-react';
import { OpenRouterService } from '../services/openrouter';
import { ApiClient } from '../services/apiClient';

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
}

export const LandingChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { sender: 'bot', text: 'Namaste! Welcome to LogiLoad India. I am your AI Logistics Assistant. How can I help you optimize your shipping, routes, or load today?' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickQuestions = [
    "How does the 3D Load Optimizer work?",
    "Can it optimize shipping lanes & flights?",
    "What trucks are supported in India?",
    "How does LIFO cargo packing save costs?"
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const getBotResponse = (input: string): string => {
    const q = input.toLowerCase();
    
    if (q.includes('3d') || q.includes('load') || q.includes('space') || q.includes('pack')) {
      return "Our 3D Bin Packing Optimizer uses weight-aware heuristics to maximize cargo container volume. It places heavy items on the floor first, stackable items next, and fragile cargo on top. This keeps the vehicle's Center of Gravity low and prevents structural damage.";
    }
    if (q.includes('sea') || q.includes('air') || q.includes('ship') || q.includes('flight') || q.includes('lane')) {
      return "Yes! LogiLoad features geodesic air-route plotting and snap-to-seaway Dijkstra maritime routing. It automatically pulls live wind coordinates and marine wave heights from Open-Meteo APIs to calculate optimal speed adjustments and fuel consumption.";
    }
    if (q.includes('truck') || q.includes('fleet') || q.includes('india') || q.includes('tata') || q.includes('ashok')) {
      return "We support 11 popular Indian transport vehicles, ranging from light Ashok Leyland Dost+ (1.9T) and Tata 407 (4T) up to high-capacity multi-axle Mahindra Furio (17T) and Tata Signa (48T) logistics trailers.";
    }
    if (q.includes('lifo') || q.includes('hybrid') || q.includes('route')) {
      return "The Hybrid LIFO Optimizer solves the Travelling Salesperson Problem (TSP) for your delivery stops, then reverses the loading sequence. Items for the last stop are packed first (deep inside the truck), and items for the first stop are packed last (nearest the door). This allows immediate unloading at each stop without rearranging cargo!";
    }
    if (q.includes('price') || q.includes('cost') || q.includes('free') || q.includes('trial')) {
      return "LogiLoad is free to try! You can sign up, add customized trucks and cargo lists, import bulk excel sheets, and calculate routes without registering a credit card. Switch to our Enterprise Plan for automated API integrations.";
    }
    return "That is a great question! LogiLoad India is built on modern heuristics combining Dijkstra seaway grids, Nominatim geocoding, OSRM road engines, and weight-balanced 3D packing. Would you like to sign in as Admin or Dealer to test the live panels?";
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { sender: 'user', text }]);
    setInputText('');
    setIsTyping(true);

    try {
      // 1. Try Backend Grounded AI Assistant with Database Tools
      const backendRes = await ApiClient.sendChatMessage(text);
      if (backendRes && backendRes.response) {
        setMessages(prev => [...prev, { sender: 'bot', text: backendRes.response }]);
        setIsTyping(false);
        return;
      }
    } catch (err) {
      console.warn('Backend Chat API fallback:', err);
    }

    try {
      // 2. Fallback to OpenRouter Client
      const history = messages.map(m => ({
        role: m.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: m.text
      }));

      const response = await OpenRouterService.generateResponse(text, history);
      if (response.source === 'openrouter' && response.text) {
        setMessages((prev) => [...prev, { sender: 'bot', text: response.text }]);
      } else {
        const fallback = getBotResponse(text);
        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: response.error
              ? `${fallback}\n\n_(AI API: ${response.error.slice(0, 120)})_`
              : fallback,
          },
        ]);
      }
    } catch (e) {
      const fallback = getBotResponse(text);
      setMessages((prev) => [...prev, { sender: 'bot', text: fallback }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative bg-gradient-to-tr from-blue-600 to-purple-600 text-white p-4.5 rounded-full shadow-2xl hover:scale-110 hover:shadow-blue-500/30 transition-all duration-300 group flex items-center justify-center border border-white/10"
        >
          {/* Pulsing notification dot */}
          <span className="absolute top-0 right-0 w-3 h-3 bg-pink-500 rounded-full border border-gray-900 animate-pulse"></span>
          <MessageSquare className="w-6 h-6" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-out whitespace-nowrap text-sm font-semibold ml-0 group-hover:ml-2">
            Ask AI Assistant
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl w-[380px] md:w-[420px] h-[550px] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-5 flex items-center justify-between text-white border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-none flex items-center gap-1.5">
                  AI Logistics Assistant
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                </h3>
                <span className="text-[10px] text-blue-100 font-medium">
                  NVIDIA Nemotron (free) · OpenRouter
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages log */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-950/40">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.sender === 'bot' && (
                  <div className="w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                
                <div className={`p-3.5 rounded-2xl max-w-[78%] text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-gray-800 text-gray-200 rounded-tl-none border border-gray-700/40'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
                  <Bot className="w-4 h-4 animate-bounce" />
                </div>
                <div className="bg-gray-800 border border-gray-700/40 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions */}
          {messages.length === 1 && !isTyping && (
            <div className="px-5 py-3 border-t border-gray-800/60 bg-gray-950/20">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider flex items-center gap-1 mb-2">
                <HelpCircle className="w-3.5 h-3.5" /> Suggested Queries
              </span>
              <div className="flex flex-wrap gap-2">
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(q)}
                    className="text-left text-2xs bg-gray-850 hover:bg-gray-800 text-gray-300 border border-gray-700/65 px-2.5 py-1.5 rounded-lg transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputText);
            }}
            className="p-4 bg-gray-900 border-t border-gray-800/80 flex gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask anything about LogiLoad..."
              className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
