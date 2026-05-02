import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heart, Shield, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

/**
 * Branded login page for Pathways / Headquarters of Hope.
 * Renders before authentication. The Sign In button delegates to the Base44
 * SDK's redirectToLogin flow, which handles the actual OAuth/email auth.
 * For Pathway Forward licensees, brand-swap the logo, gradient, and copy.
 */
export default function Login() {
  const navigate = useNavigate();
  const { navigateToLogin } = useAuth();

  const handleSignIn = () => {
    navigateToLogin();
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0A1628 100%)' }}
    >
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        <Card className="p-8 bg-slate-900/80 border-slate-700 backdrop-blur-sm">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
              <span className="text-slate-900 font-heading font-bold text-base">HOH</span>
            </div>
            <h1 className="text-2xl font-heading font-bold text-white">
              Welcome to Pathways
            </h1>
            <p className="text-sm text-slate-400 mt-2 text-center">
              The reentry operating system. Powered by Headquarters of Hope.
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50">
              <Heart className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-white">Built for second chances</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Case management, learning, and outcomes — one platform.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50">
              <Shield className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-white">Secure & compliant</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Role-based access for staff, residents, and partners.</p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleSignIn}
            className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
            size="lg"
          >
            Sign In Securely <ArrowRight className="w-4 h-4" />
          </Button>

          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/auth/request-access')}
              className="text-xs text-slate-400 hover:text-amber-400 transition-colors"
            >
              Don't have an account? <span className="font-semibold">Request access</span>
            </button>
          </div>
        </Card>

        <div className="text-center mt-6 text-[10px] text-slate-500">
          <p>Pathway Forward™ · Powered by Headquarters of Hope Foundation Inc.</p>
        </div>
      </div>
    </div>
  );
}
