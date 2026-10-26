'use client';
import {PrivateConversation} from './private-conversation';
export function PrivateCopilot({version,refresh,supportDestination}:{version:number;refresh:()=>Promise<void>;supportDestination?:string}){
 return <PrivateConversation version={version} supportDestination={supportDestination} refresh={refresh}/>;
}
