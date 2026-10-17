import { CopilotWorkspace } from '../../../src/features/demo/copilot-workspace';
export default async function CopilotPage({ searchParams }: { searchParams: Promise<{prompt?:string|string[]}> }) {
  const params=await searchParams;
  return <CopilotWorkspace initialPrompt={typeof params.prompt==='string'?params.prompt.slice(0,2000):''}/>;
}
