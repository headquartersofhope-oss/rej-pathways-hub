import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { LogIn, FileText, Heart, Users, ArrowRight } from 'lucide-react';

export default function PublicLanding() {
  const navigate = useNavigate();

  const cards = [
    {
      title: 'Log In',
      description: 'Existing users sign in here',
      icon: LogIn,
      path: '/auth/login',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      ctaColor: 'text-primary',
      cta: 'Sign In',
    },
    {
      title: 'Request Access',
      description: 'New residents, staff, or partners can apply for access',
      icon: FileText,
      path: '/auth/request-access',
      iconBg: 'bg-accent/10',
      iconColor: 'text-accent',
      ctaColor: 'text-accent',
      cta: 'Apply',
    },
    {
      title: 'Donate',
      description: 'Join our donor community and fund second chances',
      icon: Heart,
      path: '/donate/signup',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      ctaColor: 'text-amber-600',
      cta: 'Give',
    },
    {
      title: 'Become a Sponsor',
      description: 'Walk alongside someone rebuilding their life',
      icon: Users,
      path: '/sponsor/signup',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      ctaColor: 'text-purple-600',
      cta: 'Sponsor',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 mb-4">
            <span className="text-slate-900 font-heading font-bold text-sm">HOH</span>
          </div>
          <h1 className="text-4xl font-heading font-bold text-foreground mb-2">
            Headquarters of Hope
          </h1>
          <p className="text-lg text-muted-foreground">
            The reentry operating system. Powered by Pathways.
          </p>
        </div>

        {/* 4-up grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.title}
                onClick={() => navigate(card.path)}
                className="p-6 hover:shadow-lg transition-all cursor-pointer group flex flex-col"
              >
                <div className={`w-12 h-12 rounded-lg ${card.iconBg} flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${card.iconColor}`} />
                </div>
                <h2 className="text-lg font-heading font-semibold text-foreground mb-2">{card.title}</h2>
                <p className="text-sm text-muted-foreground mb-4 flex-1">{card.description}</p>
                <div className={`flex items-center gap-1 text-sm font-medium ${card.ctaColor}`}>
                  {card.cta} <ArrowRight className="w-4 h-4" />
                </div>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p>Headquarters of Hope Foundation Inc. is a 501(c)(3) nonprofit organization.</p>
          <p className="mt-1">All resident accounts must be approved before accessing the system.</p>
        </div>
      </div>
    </div>
  );
}
