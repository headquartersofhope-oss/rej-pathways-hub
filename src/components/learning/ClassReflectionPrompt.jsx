import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

const REFLECTION_PROMPTS = {
  orientation: 'What is one thing you learned today that will help you succeed?',
  employment: 'How can you apply what you learned to your job search or work?',
  housing: 'What is one action you can take this week to improve your housing situation?',
  financial_literacy: 'What is one small change you can make to manage your money better?',
  digital_literacy: 'What was the most useful skill you learned today?',
  ai_literacy: 'How do you think you might use AI to help you?',
  life_skills: 'What is one habit or skill you want to practice from this class?',
  wellness: 'What is one way you can take care of yourself this week?',
  documentation: 'What document will you work on getting first?',
};

export default function ClassReflectionPrompt({ assignmentId, category, onComplete }) {
  const [reflection, setReflection] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const prompt = REFLECTION_PROMPTS[category] || 'What did you learn from this class?';

  const handleSubmit = async () => {
    if (!reflection.trim()) {
      setError('Please write something before submitting.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await base44.entities.LearningAssignment.update(assignmentId, {
        reflection_notes: reflection.trim(),
        status: 'completed',
        completion_date: new Date().toISOString(),
      });

      setSubmitted(true);
      if (onComplete) onComplete();
    } catch (e) {
      setError('Failed to save reflection: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <Card className="p-6 bg-green-50 border-l-4 border-l-green-500">
        <div className="text-center">
          <p className="font-semibold text-green-900 mb-2">✓ Thank you for your reflection!</p>
          <p className="text-sm text-green-800">
            Your thoughts help us support you better. Great job completing this class!
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-blue-50">
        <Label className="text-blue-900 font-semibold">
          {prompt}
        </Label>
        <p className="text-xs text-blue-700 mt-2">
          Take a moment to think about what you learned and how you'll use it.
        </p>
      </Card>

      <Textarea
        placeholder="Share your thoughts..."
        value={reflection}
        onChange={(e) => setReflection(e.target.value)}
        className="min-h-24"
      />

      {error && (
        <div className="flex gap-2 p-3 bg-red-50 text-red-700 rounded-md">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={saving || !reflection.trim()}
        className="w-full"
      >
        {saving ? 'Saving...' : 'Complete Class'}
      </Button>
    </div>
  );
}