import React, { useEffect } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getModule, MODULES } from '@/lib/modules';

export default function ModulePlaceholder() {
  const { user } = useOutletContext();
  const { slug } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const redirectMap = {
      intake_barriers: '/intake',
      learning: '/learning',
      case_management: '/case-management',
      job_readiness: '/job-readiness',
      job_matching: '/job-matching',
      outcomes_reporting: '/outcomes',
    };
    if (redirectMap[slug]) navigate(redirectMap[slug], { replace: true });
  }, [slug]);
  const mod = getModule(slug);

  if (!mod) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-7xl mx-auto">
        <Card className="flex flex-col items-center py-16 text-center">
          <p className="font-heading font-semibold text-lg">Module not found</p>
          <Link to="/">
            <Button variant="outline" className="mt-4 gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const Icon = mod.icon;

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-3xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <Card className="flex flex-col items-center py-16 px-6 text-center">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 ${mod.color}`}>
          <Icon className="w-8 h-8" />
        </div>
        <h2 className="font-heading text-2xl font-bold text-foreground mb-2">{mod.name}</h2>
        <p className="text-sm text-muted-foreground max-w-md mb-6">{mod.description}</p>
        <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm">
          <Lock className="w-3.5 h-3.5" />
          Module Coming Soon
        </Badge>
        <p className="text-xs text-muted-foreground mt-4 max-w-sm">
          This module is under development. When enabled, it will appear here with full functionality.
          Contact your administrator for more information.
        </p>
      </Card>

      {/* Related Modules */}
      <div className="mt-8">
        <h3 className="font-heading font-semibold text-sm mb-3">Other Modules</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MODULES.filter(m => m.slug !== slug).slice(0, 4).map((m) => {
            const MIcon = m.icon;
            return (
              <Link
                key={m.slug}
                to={`/module/${m.slug}`}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary/20 hover:shadow-sm transition-all text-center"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${m.color}`}>
                  <MIcon className="w-4 h-4" />
                </div>
                <p className="text-xs font-medium">{m.name}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}