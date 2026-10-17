import { CopilotWorkspace } from '../../../src/features/demo/copilot-workspace';
import { FLAGSHIP_COMMAND } from '../../../src/agent/deterministic-demo';
export default function CompetitionPage(){return <CopilotWorkspace initialPrompt={FLAGSHIP_COMMAND} presentation/>}
