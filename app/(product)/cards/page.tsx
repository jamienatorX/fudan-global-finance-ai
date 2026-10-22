import { LocalizedDiv } from '../../../src/i18n/localized';
import { RelocatedDetails } from '../../../src/features/overview/relocated-details';
import { CardsWorkspace } from '../../../src/features/demo/scenario-workspaces';
export default function Page() { return <LocalizedDiv className="student-relocated-details"><CardsWorkspace /><RelocatedDetails section="cards" /></LocalizedDiv>; }
