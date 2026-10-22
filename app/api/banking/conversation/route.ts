import type {NextRequest} from 'next/server';
import {authenticatedBanking} from '../../../../src/server/secure-banking';
import {bankingConversation} from '../../../../src/server/banking-conversation';
import {conversationBody,conversationError,conversationReply} from '../../../../src/server/conversation-http';
export const runtime='nodejs';
export async function POST(request:NextRequest){try{const body=await conversationBody(request),session=await authenticatedBanking();if(!session)throw new Error('AUTH_REQUIRED');const guard=await session.client.rpc('bank_security_guard');if(guard.error)throw new Error(guard.error.message);return conversationReply(await bankingConversation(session.client,body));}catch(e){return conversationError(e);}}
