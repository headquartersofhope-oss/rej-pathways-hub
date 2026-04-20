import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sparkles, X, Send, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const PulsingDot = () => (
  <motion.div
    animate={{ opacity: [0.4, 1, 0.4] }}
    transition={{ duration: 1.5, repeat: Infinity }}
    className="inline-block w-2 h-2 bg-amber-500 rounded-full mx-0.5"
  />
);

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

export default function AppAssistant({
  appName = 'Assistant',
  appColor = '#F59E0B',
  userRole = 'resident',
  userName = 'User',
  systemContextFn = null,
  organizationId = null,
  floatingButtonPosition = { bottom: '100px', right: '20px' },
  onMessageSent = null,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (message = input) => {
    if (!message.trim()) return;

    const userMessage = message;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const context = {
        conversationHistory: messages,
        userName,
        organizationId,
      };

      // Get app-specific system context if function provided
      if (systemContextFn && typeof systemContextFn === 'function') {
        const appContext = await systemContextFn();
        Object.assign(context, appContext);
      }

      const response = await base44.functions.invoke('aiAssistant', {
        userMessage: userMessage,
        userRole: userRole,
        context: context,
      });

      if (response.data.success) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: response.data.message },
        ]);
        if (onMessageSent) {
          onMessageSent(userMessage, response.data.message);
        }
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

  const handleClearConversation = () => {
    if (confirm('Clear conversation history?')) {
      setMessages([]);
    }
  };

  const roleColor = ROLE_COLORS[userRole] || appColor;
  const userInitials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

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
          ...floatingButtonPosition,
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#161B22',
          border: `2px solid #30363D`,
          boxShadow: `0 8px 32px ${appColor}33`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 40,
        }}
      >
        <Sparkles className="w-6 h-6" style={{ color: appColor }} />
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
                <Sparkles className="w-5 h-5" style={{ color: appColor }} />
                <span style={{ color: '#FFFFFF', fontWeight: '600' }}>{appName}</span>
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
                    <Sparkles className="w-8 h-8 mx-auto mb-3" style={{ color: appColor }} />
                    <p>Hi {userName}! Ask me anything about this app.</p>
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
                            background: `linear-gradient(135deg, ${appColor}, ${appColor}dd)`,
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
                          backgroundColor: msg.role === 'user' ? appColor : '#21262D',
                          color: msg.role === 'user' ? '#0D1117' : '#CDD9E5',
                          fontSize: '14px',
                          lineHeight: '1.4',
                          wordBreak: 'break-word',
                        }}
                      >
                        {msg.content}
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

            {/* Controls */}
            <div
              style={{
                padding: '12px',
                borderTop: '1px solid #30363D',
                display: 'flex',
                gap: '8px',
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
                style={{
                  backgroundColor: appColor,
                  color: '#0D1117',
                }}
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