import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sparkles, X, Send, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ROLE_COLORS = {
  admin: '#F59E0B',
  super_admin: '#A78BFA',
  case_manager: '#60A5FA',
  housing_staff: '#34D399',
  employment_staff: '#FBBF24',
  probation_officer: '#F87171',
  employer: '#2DD4BF',
  resident: '#818CF8',
};

const SUGGESTED_PROMPTS = {
  case_manager: [
    'My open tasks',
    'Housing status',
    'Upcoming rides',
  ],
  admin: [
    'System health',
    'Overdue tasks',
    'Bed availability',
  ],
  super_admin: [
    'Full system report',
    'Team status',
    'Health check',
  ],
};

const PulsingDot = () => (
  <motion.div
    animate={{ opacity: [0.4, 1, 0.4] }}
    transition={{ duration: 1.5, repeat: Infinity }}
    className="inline-block w-2 h-2 bg-amber-500 rounded-full mx-0.5"
  />
);

export default function AppAssistant({ userRole }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [lastContext, setLastContext] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const buildContext = () => {
    const context = {
      conversationHistory: messages,
      includeSystemPrompt: devMode && userRole === 'super_admin',
    };

    if (userRole === 'case_manager') {
      context.assignedResidentsCount = 5;
      context.openTasksCount = 12;
      context.housingPendingCount = 2;
      context.upcomingRidesCount = 3;
    } else if (userRole === 'admin') {
      context.totalResidents = 143;
      context.activePlacements = 89;
      context.bedsAvailable = 12;
      context.teamMembers = 18;
      context.overdueTasks = 7;
    } else if (userRole === 'super_admin') {
      context.totalResidents = 143;
      context.activePlacements = 89;
      context.bedsAvailable = 12;
      context.teamMembers = 18;
      context.overdueTasks = 7;
      context.systemHealth = {
        totalResidents: 143,
        activeCases: 127,
        availableBeds: 12,
        ridesToday: 18,
        overdueTasks: 7,
        systemStatus: 'Healthy',
        lastSync: new Date().toISOString(),
      };
    }

    setLastContext(context);
    return context;
  };

  const handleSendMessage = async (message = input) => {
    if (!message.trim()) return;

    const userMessage = message;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const context = buildContext();
      const response = await base44.functions.invoke('aiAssistant', {
        userMessage: userMessage,
        userRole: userRole,
        context: context,
      });

      if (response.data.success) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: response.data.message, systemPrompt: response.data.systemPrompt },
        ]);
      }
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestedPrompt = (prompt) => {
    handleSendMessage(prompt);
  };

  const handleClearConversation = () => {
    if (confirm('Clear conversation history?')) {
      setMessages([]);
      setLastContext(null);
    }
  };

  const suggestedPrompts = SUGGESTED_PROMPTS[userRole] || [];
  const roleColor = ROLE_COLORS[userRole] || '#F59E0B';
  const userInitials = 'U';

  return (
    <>
      {/* Floating Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '100px',
          right: '20px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#161B22',
          border: `2px solid #30363D`,
          boxShadow: '0 8px 32px rgba(245, 158, 11, 0.2)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 40,
        }}
      >
        <Sparkles className="w-6 h-6" style={{ color: '#F59E0B' }} />
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed',
              bottom: '20px',
              right: '20px',
              width: '400px',
              height: '600px',
              backgroundColor: '#161B22',
              border: '1px solid #30363D',
              borderRadius: '1rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              zIndex: 41,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px',
                borderBottom: '1px solid #30363D',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles className="w-5 h-5" style={{ color: '#F59E0B' }} />
                <span style={{ color: '#FFFFFF', fontWeight: '600' }}>HOH Assistant</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Badge
                  style={{
                    backgroundColor: `${roleColor}20`,
                    color: roleColor,
                    border: `1px solid ${roleColor}`,
                  }}
                >
                  {userRole}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8"
                >
                  <X className="w-4 h-4" style={{ color: '#8B949E' }} />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {messages.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#8B949E',
                    textAlign: 'center',
                  }}
                >
                  <div>
                    <Sparkles className="w-8 h-8 mx-auto mb-3" style={{ color: '#F59E0B' }} />
                    <p>Hi! Ask me anything about Pathways Hub.</p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        display: 'flex',
                        justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        gap: '8px',
                      }}
                    >
                      {msg.role === 'assistant' && (
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Sparkles className="w-4 h-4" style={{ color: '#FFFFFF' }} />
                        </div>
                      )}
                      <div
                        style={{
                          maxWidth: msg.role === 'user' ? '300px' : '280px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          backgroundColor: msg.role === 'user' ? '#F59E0B' : '#21262D',
                          color: msg.role === 'user' ? '#0D1117' : '#CDD9E5',
                          fontSize: '14px',
                          lineHeight: '1.4',
                          wordBreak: 'break-word',
                        }}
                      >
                        {msg.content}
                        {msg.systemPrompt && (
                          <div
                            style={{
                              marginTop: '8px',
                              padding: '8px',
                              backgroundColor: '#1C2128',
                              borderRadius: '4px',
                              fontSize: '12px',
                              color: '#8B949E',
                              fontFamily: 'monospace',
                              maxHeight: '150px',
                              overflowY: 'auto',
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            <strong>System Context:</strong>
                            {'\n'}
                            {msg.systemPrompt.substring(0, 500)}...
                          </div>
                        )}
                      </div>
                      {msg.role === 'user' && (
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: '#21262D',
                            border: '1px solid #30363D',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#8B949E',
                            flexShrink: 0,
                          }}
                        >
                          {userInitials}
                        </div>
                      )}
                    </motion.div>
                  ))}
                  {loading && (
                    <div
                      style={{
                        display: 'flex',
                        gap: '4px',
                        padding: '10px 12px',
                        backgroundColor: '#21262D',
                        borderRadius: '8px',
                        width: 'fit-content',
                      }}
                    >
                      <PulsingDot />
                      <PulsingDot />
                      <PulsingDot />
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Suggested Prompts */}
            {suggestedPrompts.length > 0 && messages.length === 0 && (
              <div
                style={{
                  padding: '12px',
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                  borderTop: '1px solid #30363D',
                }}
              >
                {suggestedPrompts.map((prompt, idx) => (
                  <Button
                    key={idx}
                    size="sm"
                    variant="outline"
                    onClick={() => handleSuggestedPrompt(prompt)}
                    className="text-xs"
                    style={{
                      borderColor: '#30363D',
                      color: '#CDD9E5',
                      fontSize: '12px',
                      padding: '6px 10px',
                    }}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            )}

            {/* Input */}
            <div
              style={{
                padding: '12px',
                borderTop: '1px solid #30363D',
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
              }}
            >
              {messages.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleClearConversation}
                  className="text-xs"
                  style={{ color: '#F87171' }}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {/* Dev Mode (Super Admin Only) */}
            {userRole === 'super_admin' && (
              <div
                style={{
                  padding: '8px 12px',
                  borderTop: '1px solid #30363D',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <input
                  type="checkbox"
                  checked={devMode}
                  onChange={(e) => setDevMode(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: '12px', color: '#8B949E' }}>Developer Mode</span>
              </div>
            )}

            {/* Send Input */}
            <div
              style={{
                padding: '12px',
                borderTop: '1px solid #30363D',
                display: 'flex',
                gap: '8px',
              }}
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask me anything..."
                disabled={loading}
                style={{
                  backgroundColor: '#21262D',
                  borderColor: '#30363D',
                  color: '#E6EDF3',
                  fontSize: '14px',
                }}
              />
              <Button
                onClick={() => handleSendMessage()}
                disabled={loading || !input.trim()}
                className="bg-amber-500 hover:bg-amber-600 text-slate-900"
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}