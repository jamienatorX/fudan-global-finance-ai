import Link from 'next/link';
import {OperatorInbox} from '../../src/features/support/operator-inbox';
export default function OperatorPage(){return <main className="mx-auto min-h-screen max-w-4xl space-y-5 bg-[var(--color-background)] p-5 text-[var(--color-text)]"><Link href="/banking" className="inline-block py-3">← Back to banking</Link><OperatorInbox operator/></main>;}
