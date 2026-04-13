import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, RefreshCw, Shield, Flag, User } from 'lucide-react';

const NOTE_TYPE_COLORS = {
  general: 'bg-gray-100 text-gray-600',
  progress: 'bg-blue-100 text-blue-700',
  incident: 'bg-red-100 text-red-700',
  plan_update: 'bg-purple-100 text-purple-700',
  employment: 'bg-green-100 text-green-700',
  housing: 'bg-teal-100 text-teal-700',
  mental_health: 'bg-orange-100 text-orange-700',
  legal: 'bg-yellow-100 text-yellow-700',
};

export default function NotesOversight() {
  const [caseNotes, setCaseNotes] = useState([]);
  const [probNotes, setProbNotes] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [cn, pn, res] = await Promise.all([
      base44.entities.CaseNote.list('-created_date', 30).catch(() => []),
      base44.entities.ProbationNote.list('-created_date', 20).catch(() => []),
      base44.entities.Resident.list('-created_date', 200).catch(() => []),
    ]);
    setCaseNotes(cn);
    setProbNotes(pn);
    setResidents(res);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const residentName = (id) => {
    const r = residents.find(x => x.id === id);
    return r ? `${r.first_name} ${r.last_name}` : id?.slice(0, 8) || '—';
  };

  const incidents = caseNotes.filter(n => n.note_type === 'incident');
  const confidential = caseNotes.filter(n => n.is_confidential);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-semibold text-base">Notes & Oversight Panel</h2>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />Refresh
        </Button>
      </div>

      {/* Alerts */}
      {(incidents.length > 0 || confidential.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {incidents.length > 0 && (
            <Card className="border-red-300">
              <CardContent className="p-4 flex items-center gap-3">
                <Flag className="w-5 h-5 text-red-500 shrink-0" />
                <div>
                  <p className="font-semibold text-sm">{incidents.length} Incident Note{incidents.length !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-muted-foreground">Review incident records</p>
                </div>
              </CardContent>
            </Card>
          )}
          {confidential.length > 0 && (
            <Card className="border-yellow-300">
              <CardContent className="p-4 flex items-center gap-3">
                <Shield className="w-5 h-5 text-yellow-500 shrink-0" />
                <div>
                  <p className="font-semibold text-sm">{confidential.length} Confidential Note{confidential.length !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-muted-foreground">Admin-visible only</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Recent Case Notes */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="w-4 h-4" /> Recent Case Notes (30)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {loading ? <p className="text-xs text-muted-foreground">Loading...</p> :
          caseNotes.length === 0 ? <p className="text-xs text-muted-foreground">No case notes found.</p> :
          caseNotes.map(note => (
            <div key={note.id} className="p-2.5 border rounded-lg space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`text-[10px] px-1.5 py-0 ${NOTE_TYPE_COLORS[note.note_type] || 'bg-gray-100 text-gray-600'}`}>
                  {note.note_type?.replace(/_/g, ' ')}
                </Badge>
                {note.is_confidential && <Badge className="text-[10px] px-1.5 py-0 bg-yellow-100 text-yellow-700">confidential</Badge>}
                <span className="text-xs text-muted-foreground ml-auto">{new Date(note.created_date).toLocaleDateString()}</span>
              </div>
              <p className="text-xs font-medium flex items-center gap-1.5">
                <User className="w-3 h-3 text-muted-foreground" />
                {residentName(note.resident_id)}
                <span className="text-muted-foreground">· {note.staff_name || note.created_by}</span>
              </p>
              <p className="text-xs text-muted-foreground line-clamp-2">{note.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Probation Notes */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4" /> Recent Probation Notes (20)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {loading ? <p className="text-xs text-muted-foreground">Loading...</p> :
          probNotes.length === 0 ? <p className="text-xs text-muted-foreground">No probation notes found.</p> :
          probNotes.map(note => (
            <div key={note.id} className="p-2.5 border rounded-lg space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{new Date(note.created_date).toLocaleDateString()}</span>
                <span className="text-xs text-muted-foreground ml-auto">{note.created_by}</span>
              </div>
              <p className="text-xs font-medium">{residentName(note.resident_id)}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{note.note || note.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}