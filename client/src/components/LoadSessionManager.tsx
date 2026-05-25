import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TruckIcon, 
  DropletIcon, 
  CheckCircleIcon
} from 'lucide-react';
import { getActiveLoadSessions } from '@/lib/firebase';

interface LoadSession {
  id: string;
  loadSessionId: string;
  oilTypeName: string;
  oilTypeId: string;
  totalLoadedLiters: number;
  remainingLiters: number;
  status: string;
  createdAt: any;
  loadCount: number;
}

interface LoadSessionManagerProps {
  onSelectSession?: (sessionId: string) => void;
  selectedSessionId?: string;
  className?: string;
}

export function LoadSessionManager({ onSelectSession, selectedSessionId, className }: LoadSessionManagerProps) {
  const [loadSessions, setLoadSessions] = useState<LoadSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadActiveSessions();
  }, []);

  const loadActiveSessions = async () => {
    try {
      const sessions = await getActiveLoadSessions();
      setLoadSessions(sessions as LoadSession[]);
    } catch (error) {
      console.error('Error loading active sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getProgressPercentage = (session: LoadSession) => {
    return Math.max(0, (session.remainingLiters / session.totalLoadedLiters) * 100);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-2 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TruckIcon className="w-5 h-5 text-blue-500" />
          Active Load Sessions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filter out completed sessions (balance = 0) */}
        {loadSessions.filter((session: any) => session.remainingLiters > 0).length === 0 ? (
          <div className="text-center py-6">
            <DropletIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 mb-2">No active load sessions</p>
            <p className="text-sm text-gray-400">Start loading oil to create a new session</p>
          </div>
        ) : (
          <div className="space-y-4">
            {loadSessions.filter((session: any) => session.remainingLiters > 0).map((session) => (
              <div 
                key={session.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedSessionId === session.loadSessionId 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => onSelectSession?.(session.loadSessionId)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{session.loadSessionId}</h4>
                      <Badge variant="outline">{session.oilTypeName}</Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      {session.loadCount > 1 && `${session.loadCount} loads • `}
                      {new Date(session.createdAt.toDate?.() || session.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${session.remainingLiters < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {session.remainingLiters.toLocaleString()}L
                    </div>
                    <div className="text-sm text-gray-500">
                      of {session.totalLoadedLiters.toLocaleString()}L
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Balance</span>
                    <span className={`font-medium ${session.remainingLiters < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {session.remainingLiters < 0 ? 'Negative' : `${Math.round(getProgressPercentage(session))}%`}
                    </span>
                  </div>
                  <Progress 
                    value={session.remainingLiters < 0 ? 0 : getProgressPercentage(session)} 
                    className="h-2"
                  />
                  {session.remainingLiters < 0 && (
                    <div className="text-xs text-red-600 font-medium">
                      Overdrawn by {Math.abs(session.remainingLiters).toLocaleString()}L
                    </div>
                  )}
                </div>

                {session.remainingLiters === 0 && (
                  <div className="mt-3 flex items-center justify-center gap-2 text-green-600">
                    <CheckCircleIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">Session Completed</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}