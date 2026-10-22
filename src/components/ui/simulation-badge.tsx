import { ShieldCheck } from 'lucide-react';
import { Badge } from './badge';

export function SimulationBadge() {
  return <Badge tone="warning"><ShieldCheck size={13} className="mr-1" aria-hidden />Demo</Badge>;
}

