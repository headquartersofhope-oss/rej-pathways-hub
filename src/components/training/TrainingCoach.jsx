import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, X, Send, Lightbulb } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useTrainingMode } from '@/lib/useTrainingMode';
import ModuleSelector from './ModuleSelector';

/**
 * TrainingCoach: Floating AI chat panel for interactive training
 * Shows on left side, context-aware of current page
 */
export default function TrainingCoach() {
  const location = useLocation();
  const { trainingMode, currentModule, setCurrentModule, completeModule } = useTrainingMode();
  
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [suggestedActions, setSuggestedActions] = useState([]);
  const [showModuleSelector, setShowModuleSelector] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-send page navigation message
  useEffect(() => {
    if (!trainingMode || !currentModule) return;

    const pageInfo = getPageInfo(location.pathname);
    if (pageInfo) {
      const navigationMessage = `I notice you're now on the ${pageInfo.name}. Let me guide you through what you can do here.`;
      addMessage(navigationMessage, 'coach');
      
      // Generate suggested actions for this page
      const actions = getSuggestedActionsForPage(pageInfo.slug, currentModule);
      setSuggestedActions(actions);
    }
  }, [location.pathname, trainingMode, currentModule]);

  // Initial welcome message and module selector
  useEffect(() => {
    if (trainingMode && messages.length === 0 && !currentModule) {
      const welcome = "Welcome! I'm your AI Training Coach. 🎓 Select a training module to get started. I'll guide you through the app step by step.";
      addMessage(welcome, 'coach');
      setShowModuleSelector(true);
    }
  }, [trainingMode, currentModule]);

  const addMessage = (text, sender) => {
    setMessages(prev => [...prev, { text, sender, timestamp: new Date() }]);
  };

  const handleSendMessage = async (text = userInput) => {
    if (!text.trim()) return;

    addMessage(text, 'user');
    setUserInput('');
    setLoading(true);

    try {
      const pageInfo = getPageInfo(location.pathname);
      const context = {
        currentPage: pageInfo?.name || 'Unknown Page',
        currentPageSlug: pageInfo?.slug,
        currentModule: currentModule,
        userMessage: text,
        chatHistory: messages.slice(-6), // Last 6 messages for context
      };

      const response = await base44.functions.invoke('aiAssistant', {
        mode: 'training',
        context,
      });

      if (response.data?.message) {
        addMessage(response.data.message, 'coach');
        
        // Check if coach indicates completion
        if (response.data.completedAction) {
          completeModule(currentModule);
        }
      }
    } catch (error) {
      addMessage('Sorry, I encountered an error. Please try again.', 'coach');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestedAction = (action) => {
    handleSendMessage(action);
    setShowSuggestions(false);
  };

  if (!trainingMode) return null;

  return (
    <>
      <ModuleSelector isOpen={showModuleSelector} onClose={() => setShowModuleSelector(false)} />
      <div className="fixed left-0 top-20 bottom-0 w-80 bg-card border-r border-border flex flex-col shadow-lg" style={{ zIndex: 40 }}>
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-slate-900">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg" style={{ backgroundColor: '#F59E0B14' }}>
            <span className="text-xl">🎓</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">AI Training Coach</p>
            {currentModule && (
              <p className="text-xs text-muted-foreground">{currentModule}</p>
            )}
          </div>
        </div>
        {/* Close button will be handled by parent */}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                msg.sender === 'user'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-slate-100 border border-slate-700'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 text-slate-100 border border-slate-700 px-4 py-2 rounded-lg text-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse delay-75" />
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse delay-150" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Actions */}
      {showSuggestions && suggestedActions.length > 0 && (
        <div className="px-4 py-3 border-t border-border bg-slate-900">
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
            <Lightbulb className="w-3 h-3" style={{ color: '#F59E0B' }} />
            Quick Questions
          </p>
          <div className="space-y-2">
            {suggestedActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestedAction(action)}
                className="w-full text-left text-xs p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border bg-slate-900 flex gap-2">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Ask a question..."
          className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={loading || !userInput.trim()}
          className="p-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition-colors"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
    </>
  );
}

/**
 * Extract page information from current route
 */
function getPageInfo(pathname) {
  const pageMap = {
    '/residents': { name: 'Residents', slug: 'residents' },
    '/case-management': { name: 'Case Management', slug: 'case-management' },
    '/housing-referrals': { name: 'Housing Referrals', slug: 'housing-referrals' },
    '/housing': { name: 'Housing Operations', slug: 'housing' },
    '/learning': { name: 'Learning Center', slug: 'learning' },
    '/job-matching': { name: 'Job Matching', slug: 'job-matching' },
    '/job-readiness': { name: 'Job Readiness', slug: 'job-readiness' },
    '/resources': { name: 'Resource Inventory', slug: 'resources' },
    '/intake': { name: 'Intake Assessment', slug: 'intake' },
    '/reporting': { name: 'Reporting Dashboard', slug: 'reporting' },
  };

  for (const [path, info] of Object.entries(pageMap)) {
    if (pathname.startsWith(path)) {
      return info;
    }
  }
  return null;
}

/**
 * Get suggested actions based on current page and module
 */
function getSuggestedActionsForPage(pageSlug, moduleSlug) {
  const suggestions = {
    residents: [
      'How do I add a new resident?',
      'What does each status mean?',
      'How do I find a specific resident?',
    ],
    'case-management': [
      'How do I create a service plan?',
      'How do I track tasks?',
      'What are the key sections here?',
    ],
    'housing-referrals': [
      'How do I submit a referral?',
      'What is priority level?',
      'What happens after I submit?',
    ],
    housing: [
      'How do I assign a bed?',
      'What does occupancy mean?',
      'How do I check availability?',
    ],
    learning: [
      'How do I assign a class?',
      'How do I track completion?',
      'What classes are available?',
    ],
    'job-matching': [
      'How do I create a job match?',
      'How is match score calculated?',
      'How do I advance a candidate?',
    ],
    'job-readiness': [
      'How do I build a resume?',
      'What is job readiness score?',
      'How do I schedule an interview?',
    ],
    intake: [
      'How do I complete intake?',
      'What barriers should I identify?',
      'How do I save progress?',
    ],
  };

  return suggestions[pageSlug] || [
    'What can I do here?',
    'What should I do next?',
    'Tell me more about this page.',
  ];
}