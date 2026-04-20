import React, { useState, useEffect } from 'react';
import { Award, Download, Share2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import html2canvas from 'html2canvas';

/**
 * CompletionCertificate: Digital certificate shown when user completes all required modules
 */
export default function CompletionCertificate({ completedModules, onClose }) {
  const [user, setUser] = useState(null);
  const [moduleNames, setModuleNames] = useState([]);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Fetch completed module names
      if (completedModules.length > 0) {
        const trainings = await base44.entities.Training.list();
        const completed = trainings.filter(t =>
          completedModules.includes(t.training_id)
        );
        setModuleNames(completed.map(t => t.module_title));
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const handleDownload = async () => {
    const certificateEl = document.getElementById('certificate-content');
    if (certificateEl) {
      const canvas = await html2canvas(certificateEl, {
        backgroundColor: '#0D1117',
        scale: 2,
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `training-certificate-${user?.full_name?.replace(/\s+/g, '-')}.png`;
      link.click();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="max-w-2xl w-full">
        {/* Certificate */}
        <div
          id="certificate-content"
          className="rounded-2xl p-12 border-2 relative overflow-hidden"
          style={{
            backgroundColor: '#161B22',
            borderColor: '#F59E0B',
            backgroundImage: `radial-gradient(circle at top left, rgba(245, 158, 11, 0.1), transparent), radial-gradient(circle at bottom right, rgba(245, 158, 11, 0.05), transparent)`,
          }}
        >
          {/* Gold Seal */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-30" style={{ backgroundColor: '#F59E0B' }} />

          {/* Header */}
          <div className="text-center mb-8 relative z-10">
            <Award className="w-16 h-16 mx-auto mb-4" style={{ color: '#F59E0B' }} />
            <h1 className="text-4xl font-bold text-white mb-2">Certificate of Completion</h1>
            <p className="text-amber-500 text-sm tracking-widest uppercase">Professional Training Achievement</p>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent mb-8" />

          {/* Content */}
          <div className="text-center mb-8 space-y-4 relative z-10">
            <p className="text-slate-300 text-lg">This certifies that</p>
            <p className="text-3xl font-bold text-white">{user?.full_name || 'User'}</p>

            <p className="text-slate-300 text-base mt-6">
              has successfully completed comprehensive training in
            </p>

            <div className="my-8 space-y-2">
              {moduleNames.map((name, idx) => (
                <p key={idx} className="text-xl font-semibold" style={{ color: '#F59E0B' }}>
                  {name}
                </p>
              ))}
            </div>

            <p className="text-slate-400 text-sm">
              as a <span className="font-semibold text-white capitalize">{user?.role || 'Team Member'}</span>
            </p>

            <p className="text-slate-400 text-sm pt-4">
              Awarded on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent mb-6" />

          {/* Footer Text */}
          <p className="text-center text-xs text-slate-500 relative z-10">
            This digital certificate acknowledges successful completion of all required training modules and readiness to perform assigned duties.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center mt-6">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors"
            style={{ backgroundColor: '#F59E0B', color: '#0D1117' }}
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          <button
            onClick={() => alert('Share feature coming soon')}
            className="flex items-center gap-2 px-6 py-3 rounded-lg border border-amber-500 text-amber-500 font-semibold hover:bg-amber-500/10 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-lg border border-slate-600 text-slate-300 font-semibold hover:bg-slate-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}