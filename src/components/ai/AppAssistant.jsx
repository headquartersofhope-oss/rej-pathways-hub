import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sparkles, X, Send, Trash2, ExternalLink, Copy, CheckCircle, ChevronDown } from 'lucide-react';
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
  userProfile = null,
  systemContextFn = null,
  organizationId = null,
  floatingButtonPosition = { bottom: '100px', right: '20px' },
  onMessageSent = null,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [systemSnapshot, setSystemSnapshot] = useState(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [buttonStates, setButtonStates] = useState({ brief: false, copy: false, export: false, debug: false });
  const [showRawContext, setShowRawContext] = useState(false);
  const messagesEndRef = useRef(null);

  const isSuperAdmin = userProfile?.app_role === 'super_admin';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && isSuperAdmin && !systemSnapshot && !snapshotLoading) {
      loadSystemSnapshot();
    }
  }, [isOpen, isSuperAdmin]);

  const loadSystemSnapshot = async () => {
    setSnapshotLoading(true);
    try {
      const response = await base44.functions.invoke('getSystemSnapshot', {});
      setSystemSnapshot(response.data);
    } catch (error) {
      console.error('Failed to load system snapshot:', error);
    } finally {
      setSnapshotLoading(false);
    }
  };

  const getSystemReport = () => {
    if (!systemSnapshot) return '';
    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });
    return `PATHWAYS HUB LIVE SYSTEM REPORT\nTimestamp: ${timestamp}\n\n${JSON.stringify(systemSnapshot, null, 2)}`;
  };

  const handleBriefClaude = () => {
    const report = getSystemReport();
    const message = `I am ${userName}, super admin of ${appName}. Here is my live system report. Please analyze this and tell me what needs attention.\n\n${report}`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://claude.ai?message=${encodedMessage}`, '_blank');
    setButtonStates(prev => ({ ...prev, brief: true }));
    setTimeout(() => setButtonStates(prev => ({ ...prev, brief: false })), 2000);
  };

  const handleCopyBrief = async () => {
    const report = getSystemReport();
    const message = `I am ${userName}, super admin of ${appName}. Here is my live system report. Please analyze this and tell me what needs attention.\n\n${report}`;
    try {
      await navigator.clipboard.writeText(message);
      toast.success('Brief copied to clipboard');
      setButtonStates(prev => ({ ...prev, copy: true }));
      setTimeout(() => setButtonStates(prev => ({ ...prev, copy: false })), 2000);
    } catch (error) {
      toast.error('Failed to copy brief');
    }
  };

  const handleExportClaude = async () => {
    const report = getSystemReport();
    try {
      await navigator.clipboard.writeText(report);
      toast.success('Report exported to clipboard');
      setButtonStates(prev => ({ ...prev, export: true }));
      setTimeout(() => setButtonStates(prev => ({ ...prev, export: false })), 2000);
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  const handleGenerateDebug = async () => {
    try {
      const response = await base44.functions.invoke('generateDebugPackage', {});
      const debugReport = JSON.stringify(response.data, null, 2);
      await navigator.clipboard.writeText(debugReport);
      toast.success('Debug package generated and copied');
      setButtonStates(prev => ({ ...prev, debug: true }));
      setTimeout(() => setButtonStates(prev => ({ ...prev, debug: false })), 2000);
    } catch (error) {
      toast.error('Failed to generate debug package');
    }
  };

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
              maxHeight: '700px',
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

            {/* Developer Mode Section */}
            {isSuperAdmin && (
              <div style={{ borderTop: '1px solid #30363D' }}>
                <div
                  style={{
                    padding: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#0D1117',
                  }}
                >
                  <span style={{ color: '#8B949E', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>
                    Developer Mode
                  </span>
                  <motion.div
                    animate={{ rotate: isDeveloperMode ? 180 : 0 }}
                    onClick={() => setIsDeveloperMode(!isDeveloperMode)}
                    style={{
                      width: '40px',
                      height: '20px',
                      borderRadius: '10px',
                      backgroundColor: isDeveloperMode ? '#F59E0B' : '#30363D',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2px',
                    }}
                  >
                    <motion.div
                      animate={{ x: isDeveloperMode ? 20 : 0 }}
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                      }}
                    />
                  </motion.div>
                </div>

                {isDeveloperMode && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ backgroundColor: '#0D1117', overflow: 'hidden' }}
                  >
                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* Developer Buttons Row 1 */}
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <Button
                          size="sm"
                          onClick={handleBriefClaude}
                          className="text-xs"
                          style={{
                            backgroundColor: buttonStates.brief ? '#34D399' : '#F59E0B',
                            color: '#0D1117',
                            padding: '4px 8px',
                            height: 'auto',
                            fontSize: '10px',
                            flex: 1,
                            minWidth: '100px',
                          }}
                          disabled={snapshotLoading}
                        >
                          {buttonStates.brief ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Done
                            </>
                          ) : (
                            <>
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Brief Claude
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleCopyBrief}
                          className="text-xs"
                          style={{
                            backgroundColor: buttonStates.copy ? '#34D399' : '#60A5FA',
                            color: '#0D1117',
                            padding: '4px 8px',
                            height: 'auto',
                            fontSize: '10px',
                            flex: 1,
                            minWidth: '100px',
                          }}
                          disabled={snapshotLoading}
                        >
                          {buttonStates.copy ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 mr-1" />
                              Copy Brief
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Developer Buttons Row 2 */}
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <Button
                          size="sm"
                          onClick={handleExportClaude}
                          className="text-xs"
                          style={{
                            backgroundColor: buttonStates.export ? '#34D399' : '#94A3B8',
                            color: '#0D1117',
                            padding: '4px 8px',
                            height: 'auto',
                            fontSize: '10px',
                            flex: 1,
                            minWidth: '100px',
                          }}
                          disabled={snapshotLoading}
                        >
                          {buttonStates.export ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Exported
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 mr-1" />
                              Export Report
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleGenerateDebug}
                          className="text-xs"
                          style={{
                            backgroundColor: buttonStates.debug ? '#34D399' : '#64748B',
                            color: '#0D1117',
                            padding: '4px 8px',
                            height: 'auto',
                            fontSize: '10px',
                            flex: 1,
                            minWidth: '100px',
                          }}
                        >
                          {buttonStates.debug ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Generated
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 mr-1" />
                              Debug Package
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Raw Context Collapsible */}
                      <div
                        onClick={() => setShowRawContext(!showRawContext)}
                        style={{
                          backgroundColor: '#161B22',
                          border: '1px solid #30363D',
                          borderRadius: '4px',
                          padding: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <motion.div animate={{ rotate: showRawContext ? 90 : 0 }}>
                          <ChevronDown className="w-3 h-3" style={{ color: '#34D399' }} />
                        </motion.div>
                        <span style={{ color: '#34D399', fontSize: '10px', fontWeight: '600' }}>
                          Raw System Context
                        </span>
                      </div>

                      {showRawContext && systemSnapshot && (
                        <div
                          style={{
                            backgroundColor: '#0D1117',
                            border: '1px solid #30363D',
                            borderRadius: '4px',
                            padding: '8px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            fontFamily: 'monospace',
                            fontSize: '9px',
                            color: '#34D399',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                          }}
                        >
                          {JSON.stringify(systemSnapshot, null, 2)}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}