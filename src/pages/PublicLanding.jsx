import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LogIn, FileText, ArrowRight } from 'lucide-react';

export default function PublicLanding() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-4">
            <span className="text-primary-foreground font-heading font-bold">REJ</span>
          </div>
          <h1 className="text-4xl font-heading font-bold text-foreground mb-2">
            Reentry & Jobs
          </h1>
          <p className="text-lg text-muted-foreground">
            Secure access platform for residents, staff, employers, and partners
          </p>
        </div>

        {/* Main Options */}
        <div className="grid sm:grid-cols-2 gap-6 mb-8">
          {/* Login */}
          <Card className="p-8 hover:shadow-lg transition-all cursor-pointer group" 
                onClick={() => navigate('/auth/login')}>
            <div className="flex flex-col items-center text-center h-full">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <LogIn className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-heading font-semibold text-foreground mb-2">
                Log In
              </h2>
              <p className="text-sm text-muted-foreground mb-6 flex-1">
                Existing approved users can log in with their email and password
              </p>
              <div className="flex items-center justify-center gap-2 text-primary font-medium">
                Sign In <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Card>

          {/* Request Access */}
          <Card className="p-8 hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => navigate('/auth/request-access')}>
            <div className="flex flex-col items-center text-center h-full">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                <FileText className="w-6 h-6 text-accent" />
              </div>
              <h2 className="text-xl font-heading font-semibold text-foreground mb-2">
                Request Access
              </h2>
              <p className="text-sm text-muted-foreground mb-6 flex-1">
                New residents and users can complete intake and request system access
              </p>
              <div className="flex items-center justify-center gap-2 text-accent font-medium">
                Get Started <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Card>
        </div>

        {/* Footer Info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>All users must be approved by an administrator before accessing the system.</p>
        </div>
      </div>
    </div>
  );
}