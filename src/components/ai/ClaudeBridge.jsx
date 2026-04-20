import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function ClaudeBridge({
  systemReport = '',
  userName = 'User',
  appName = 'Application',
  showBriefButton = true,
  showCopyButton = true,
  briefButtonColor = '#F59E0B',
  copyButtonColor = '#60A5FA',
}) {
  const [buttonState, setButtonState] = useState({ brief: false, copy: false });

  const generateClaudeBrief = () => {
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'America/Chicago',
    });

    return `I am ${userName}, administrator of ${appName}. Here is my live system report as of ${timestamp}. Please analyze this and tell me what needs attention.\n\n${systemReport}`;
  };

  const handleBriefClaude = () => {
    const message = generateClaudeBrief();
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://claude.ai?message=${encodedMessage}`, '_blank');

    setButtonState(prev => ({ ...prev, brief: true }));
    setTimeout(() => setButtonState(prev => ({ ...prev, brief: false })), 2000);
  };

  const handleCopyBrief = async () => {
    const message = generateClaudeBrief();

    try {
      await navigator.clipboard.writeText(message);
      toast.success('Brief copied to clipboard');
      setButtonState(prev => ({ ...prev, copy: true }));
      setTimeout(() => setButtonState(prev => ({ ...prev, copy: false })), 2000);
    } catch (error) {
      toast.error('Failed to copy brief');
    }
  };

  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {showBriefButton && (
        <Button
          size="sm"
          onClick={handleBriefClaude}
          className="text-xs"
          style={{
            backgroundColor: buttonState.brief ? '#34D399' : briefButtonColor,
            color: '#0D1117',
            padding: '4px 8px',
            height: 'auto',
            fontSize: '11px',
          }}
        >
          {buttonState.brief ? (
            <>
              <Check className="w-3 h-3 mr-1" />
              Done
            </>
          ) : (
            <>
              <ExternalLink className="w-3 h-3 mr-1" />
              Brief Claude
            </>
          )}
        </Button>
      )}

      {showCopyButton && (
        <Button
          size="sm"
          onClick={handleCopyBrief}
          className="text-xs"
          style={{
            backgroundColor: buttonState.copy ? '#34D399' : copyButtonColor,
            color: '#0D1117',
            padding: '4px 8px',
            height: 'auto',
            fontSize: '11px',
          }}
        >
          {buttonState.copy ? (
            <>
              <Check className="w-3 h-3 mr-1" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 mr-1" />
              Copy Brief
            </>
          )}
        </Button>
      )}
    </div>
  );
}