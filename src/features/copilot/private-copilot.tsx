'use client';
import {PrivateConversation} from './private-conversation';
export function PrivateCopilot({version,refresh,supportDestination,suggestedRequest}:{version:number;refresh:()=>Promise<void>;supportDestination?:string;suggestedRequest?:{id:string;text:string}}){
 return <PrivateConversation suggestedRequest={suggestedRequest} version={version} supportDestination={supportDestination} refresh={refresh}/>;
}
