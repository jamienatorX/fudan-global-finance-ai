import type { ExpenseCategory, FinancialSnapshot, Transaction } from '../../domain/entities';
import { money } from '../../domain/money';
import { MAX_CSV_BYTES, MAX_CSV_ROWS, parseTransactionCsv, readCsvRecords, type ImportRowError } from './csv-import';
export type WalletImportRow = Readonly<{ date: string; merchant: string; direction: 'credit' | 'debit'; amountMinor: string; currency: 'CNY'; category: ExpenseCategory; externalId: string | null; source: 'alipay' | 'wechat' | 'generic' }>;
const categories = ['rent','food','transportation','shopping','subscriptions','other'];
function category(text: string): ExpenseCategory {
  if (/订阅|会员|subscription|netflix|spotify|icloud/i.test(text)) return 'subscriptions';
  if (/租房|房租|rent/i.test(text)) return 'rent';
  if (/餐|饮|食|咖啡|coffee|dining|food/i.test(text)) return 'food';
  if (/交通|出行|地铁|公交|滴滴|taxi|transport/i.test(text)) return 'transportation';
  if (/购物|百货|服饰|超市|shopping/i.test(text)) return 'shopping';
  return 'other';
}
function date(value: string): string {
  const normalized = value.trim().replace(' ', 'T');
  const match = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}:\d{2}))?$/.exec(normalized);
  if (!match || new Date(match[1] + 'T00:00:00Z').toISOString().slice(0,10) !== match[1] || (match[2] && !/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(match[2]))) throw new TypeError('Invalid transaction date');
  return `${match[1]}T${match[2] ?? '00:00:00'}+08:00`;
}
export function decodeWalletCsv(bytes: ArrayBuffer): string {
  if (bytes.byteLength > MAX_CSV_BYTES) throw new RangeError('CSV file must be 1 MB or smaller.');
  try { return new TextDecoder('utf-8', {fatal:true}).decode(bytes); }
  catch { return new TextDecoder('gb18030', {fatal:true}).decode(bytes); }
}
export function parseWalletCsv(text: string): Readonly<{ validRows: readonly WalletImportRow[]; errors: readonly ImportRowError[]; skippedRows: readonly ImportRowError[]; totalRows: number }> {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_CSV_BYTES) throw new RangeError('CSV file is too large');
  const records = readCsvRecords(text.replace(/^\uFEFF/,''), MAX_CSV_ROWS + 100);
  const headerIndex = records.findIndex(r => r.some(c => c.trim() === '交易时间'));
  if (headerIndex < 0) {
    const generic = parseTransactionCsv(text);
    const errors = [...generic.errors];
    const validRows: WalletImportRow[] = [];
    for (const row of generic.validRows) {
      if (row.currency !== 'CNY') { errors.push({line:row.line,message:'Wallet history requires CNY'}); continue; }
      if (BigInt(row.amountMinor) > 1_000_000_000_000n) { errors.push({line:row.line,message:'Amount exceeds import limit'}); continue; }
      validRows.push({...row,date:date(row.date),currency:'CNY',category:category(row.merchant),source:'generic',externalId:null});
    }
    return {validRows,errors,totalRows:generic.totalRows,skippedRows:[]};
  }
  const headers = records[headerIndex].map(c=>c.trim());
  const source = headers.includes('当前状态') || headers.includes('支付方式') ? 'wechat' : 'alipay';
  const pos = (...names:string[]) => headers.findIndex(h=>names.includes(h));
  const time=pos('交易时间'), merchant=pos('交易对方'), direction=pos('收/支','收支'), amount=pos('金额(元)','金额（元）','金额'), status=pos('交易状态','当前状态'), external=pos('交易单号','交易订单号'), merchantId=pos('商户单号','商家订单号'), kind=pos('交易分类','交易类型'), product=pos('商品','商品说明','商品名称');
  if ([time,merchant,direction,amount,status].some(i=>i<0) || new Set(headers).size!==headers.length) throw new TypeError('Unsupported wallet CSV headers');
  const rows = records.slice(headerIndex+1).filter(r=>!(r.length===1 && /^[-=]|^共|^收入|^支出|^导出/.test(r[0].trim())));
  if(rows.length>MAX_CSV_ROWS) throw new RangeError('CSV row limit exceeded');
  const validRows: WalletImportRow[]=[]; const errors:ImportRowError[]=[]; const skippedRows:ImportRowError[]=[];
  rows.forEach((r,i)=>{
    const line=headerIndex+i+2;
    try {
      if(r.length!==headers.length) throw new TypeError('Incorrect number of columns');
      const details = `${kind<0?'':r[kind]} ${product<0?'':r[product]}`;
      if (/退款|退货/.test(r[status]+details)) { skippedRows.push({line,message:'Refund excluded'}); return; }
      if (!/^(交易成功|支付成功|已收款|已支付|对方已收钱|转账成功)$/.test(r[status].trim())) { skippedRows.push({line,message:'Incomplete transaction excluded'}); return; }
      if (!['收入','支出'].includes(r[direction].trim()) || /转账|红包|充值|提现|信用卡还款|理财|基金/.test(details)) { skippedRows.push({line,message:'Transfer or neutral record excluded'}); return; }
      const merchantText=r[merchant].trim();
      if(!merchantText || merchantText.length>120) throw new TypeError('Merchant must be 1 to 120 characters');
      const raw=r[amount].trim().replace(/^(?:人民币|RMB|CNY|[¥￥])\s*/i,'');
      if(!/^\d+(?:\.\d{1,2})?$/.test(raw)) throw new TypeError('Invalid CNY amount');
      const [whole,fraction='']=raw.split('.'); const minor=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
      if(minor<=0n || minor>1_000_000_000_000n) throw new TypeError('Amount exceeds import limit or is zero');
      const cleanId=(value:string)=>['','/','-','无'].includes(value.trim()) ? null : value.trim();
      const externalId=cleanId(external<0?'':r[external]) || cleanId(merchantId<0?'':r[merchantId]);
      if(externalId && (externalId.length>120 || /[\x00-\x1f]/.test(externalId))) throw new TypeError('Invalid external ID');
      validRows.push({date:date(r[time]),merchant:merchantText,direction:r[direction].trim()==='支出'?'debit':'credit',amountMinor:minor.toString(),currency:'CNY',category:category(details+' '+merchantText),externalId,source});
    } catch(e) { errors.push({line,message:e instanceof Error?e.message:'Invalid row'}); }
  });
  return {validRows,errors,skippedRows,totalRows:rows.length};
}
function fingerprint(row: WalletImportRow): string { return [new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(row.date)),row.merchant.trim().toLowerCase(),row.amountMinor,row.direction,row.currency].join('|'); }
function externalKey(row: WalletImportRow): string | null { return row.externalId ? `wallet:${row.source}:${encodeURIComponent(row.externalId)}` : null; }
export function dedupeWalletRows(rows: readonly WalletImportRow[], existing: readonly Transaction[]) {
  const ids=new Set(existing.map(t=>t.id)); const fingerprints=new Set(existing.filter(t=>!/^wallet:(alipay|wechat):/.test(t.id)).map(t=>fingerprint({date:t.occurredAt,merchant:t.merchant,amountMinor:t.amount.amountMinor.toString(),direction:t.direction,currency:t.amount.currency as 'CNY',category:'other',externalId:null,source:'generic'})));
  const allFingerprints=new Set(existing.map(t=>fingerprint({date:t.occurredAt,merchant:t.merchant,amountMinor:t.amount.amountMinor.toString(),direction:t.direction,currency:t.amount.currency as 'CNY',category:'other',externalId:null,source:'generic'})));
  const unique:WalletImportRow[]=[]; let duplicateCount=0;
  for(const row of rows) { const key=externalKey(row); const fp=fingerprint(row); if((key && ids.has(key)) || (key ? fingerprints : allFingerprints).has(fp)) duplicateCount++; else {unique.push(row); allFingerprints.add(fp); if(key)ids.add(key); else fingerprints.add(fp);} }
  return {unique,duplicateCount};
}
export function importWalletRows(snapshot: FinancialSnapshot, accountId:string, rows:readonly WalletImportRow[], id:string): FinancialSnapshot {
  const account=snapshot.accounts.find(a=>a.id===accountId && a.ownerId===snapshot.users[0]?.id && a.currency==='CNY' && a.status==='active');
  if(!account || !Array.isArray(rows) || !rows.length || rows.length>MAX_CSV_ROWS || typeof id!=='string' || id.length>200) throw new TypeError('Invalid wallet import');
  for(const r of rows) if(!r || r.currency!=='CNY' || !['credit','debit'].includes(r.direction) || !categories.includes(r.category) || !['generic','alipay','wechat'].includes(r.source) || typeof r.merchant!=='string' || !r.merchant.trim() || r.merchant.length>120 || typeof r.amountMinor!=='string' || !/^\d{1,13}$/.test(r.amountMinor) || BigInt(r.amountMinor)<=0n || BigInt(r.amountMinor)>1_000_000_000_000n || typeof r.date!=='string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/.test(r.date) || date(r.date.slice(0,19))!==r.date || (r.externalId!==null && (typeof r.externalId!=='string' || !r.externalId.trim() || r.externalId.length>120 || /[\x00-\x1f]/.test(r.externalId)))) throw new TypeError('Invalid wallet import row');
  const {unique}=dedupeWalletRows(rows,snapshot.transactions);
  const transactions:Transaction[]=unique.map((r,i)=>({id:externalKey(r)??`wallet:${id}:${i}`,ownerId:account.ownerId,accountId,direction:r.direction,amount:money(r.amountMinor,'CNY'),originalCurrency:'CNY',category:r.category,classification:r.direction==='credit'?'income':'consumption',merchant:r.merchant,occurredAt:r.date,recordedAt:snapshot.asOf,transferId:null,investmentOrderId:null,subscriptionId:null,recurrence:null,anomaly:null}));
  const budgets=snapshot.budgets.map(b=>{ const added=unique.filter(r=>r.direction==='debit' && r.date.slice(0,7)===b.month && r.category===b.category && b.currency==='CNY' && b.ownerId===account.ownerId).reduce((sum,r)=>sum+BigInt(r.amountMinor),0n); const actualSpend=money(b.actualSpend.amountMinor+added,b.currency); return {...b,actualSpend,status:actualSpend.amountMinor>b.limit.amountMinor?'over-limit' as const:'within-limit' as const}; });
  return {...snapshot,transactions:[...transactions,...snapshot.transactions],budgets};
}
