import { describe, expect, it } from 'vitest';
import { decodeWalletCsv, parseWalletCsv, dedupeWalletRows, importWalletRows } from '../../src/features/transactions/wallet-csv';
import { createSeedSnapshot, DEFAULT_SEED_VERSION } from '../../src/demo/seed';
const alipay = '支付宝交易记录\n导出时间：2026-10-20\n交易时间,交易分类,交易对方,商品说明,收/支,金额(元),交易状态,交易订单号,商家订单号\n2026-10-12 12:30:00,餐饮美食,"Coffee, Campus",午餐,支出,￥25.50,交易成功,12345\\t,\n2026-10-13 09:00:00,其他,学校,奖学金,收入,100.00,交易成功,222,\n2026-10-14 09:00:00,转账,朋友,转账,支出,20.00,交易成功,333,\n2026-10-14 09:00:00,其他,店铺,退款,收入,20.00,退款成功,444,';
describe('wallet CSV history',()=>{
 it('detects preamble, quoted merchants, CNY amounts, exclusions and income',()=>{
   const p=parseWalletCsv(alipay.replace('\\t','\t'));
   expect(p.errors).toEqual([]); expect(p.validRows).toHaveLength(2); expect(p.skippedRows).toHaveLength(2);
   expect(p.validRows[0]).toMatchObject({merchant:'Coffee, Campus',amountMinor:'2550',category:'food',externalId:'12345',date:'2026-10-12T12:30:00+08:00',direction:'debit'});
   expect(p.validRows[1].direction).toBe('credit');
 });
 it('detects WeChat and subscriptions; excludes unfinished and neutral payments',()=>{
   const p=parseWalletCsv('微信支付账单明细\n交易时间,交易类型,交易对方,商品,收/支,金额(元),支付方式,当前状态,交易单号,商户单号\n2026-10-12 09:00:00,商户消费,Spotify,会员,支出,¥10.00,零钱,支付成功,wx1,\n2026-10-12 09:00:00,商户消费,Store,商品,支出,10.00,零钱,已关闭,wx2,\n2026-10-12 09:00:00,其他,Store,商品,不计收支,10.00,零钱,支付成功,wx3,');
   expect(p.validRows[0]).toMatchObject({source:'wechat',category:'subscriptions'}); expect(p.skippedRows).toHaveLength(2);
 });
 it('isolates malformed amounts/dates and accepts generic CNY',()=>{
   const p=parseWalletCsv('date,merchant,amount,currency\n2026-02-30,bad,-1,CNY\n2026-10-12,Netflix,-12,CNY\n2026-10-12,foreign,-1,USD');
   expect(p.validRows).toHaveLength(1); expect(p.errors).toHaveLength(2);
 });
 it('decodes BOM and GBK, with byte and row bounds',()=>{
   expect(decodeWalletCsv(new Uint8Array([0xef,0xbb,0xbf,65]).buffer)).toBe('A');
   expect(decodeWalletCsv(new Uint8Array([0xd6,0xd0]).buffer)).toBe('中');
   expect(()=>decodeWalletCsv(new ArrayBuffer(1_000_001))).toThrow();
   expect(()=>parseWalletCsv('date,merchant,amount,currency\n'+ '2026-10-12,x,-1,CNY\n'.repeat(1001))).toThrow();
 });
 it('imports after dedupe, preserves balances, updates matching budgets and rejects unsafe runtime input',()=>{
   const snapshot=createSeedSnapshot(DEFAULT_SEED_VERSION); const account=snapshot.accounts.find(a=>a.currency==='CNY')!;
   const row=parseWalletCsv('date,merchant,amount,currency\n'+snapshot.asOf.slice(0,10)+',Coffee,-12.34,CNY').validRows[0];
   const next=importWalletRows(snapshot,account.id,[row],'test');
   expect(next.accounts).toBe(snapshot.accounts); expect(next.transactions.length).toBe(snapshot.transactions.length+1);
   expect(dedupeWalletRows([row],next.transactions).duplicateCount).toBe(1);
   const before=snapshot.budgets.find(b=>b.month===row.date.slice(0,7)&&b.category==='food'&&b.currency==='CNY');
   if(before) expect(next.budgets.find(b=>b.id===before.id)!.actualSpend.amountMinor).toBe(before.actualSpend.amountMinor+1234n);
   expect(()=>importWalletRows(snapshot,account.id,[{...row,amountMinor:'1000000000001'}],'x')).toThrow();
   expect(()=>importWalletRows(snapshot,'missing',[row],'x')).toThrow();
 });
 it('prefers source ID yet detects historical seed fingerprints',()=>{
   const rows=parseWalletCsv(alipay.replace('\\t','\t')).validRows;
   expect(dedupeWalletRows([rows[0],rows[0],{...rows[0],externalId:'different'}],[]).unique).toHaveLength(2);
   const snapshot=createSeedSnapshot(DEFAULT_SEED_VERSION); const t=snapshot.transactions.find(t=>t.amount.currency==='CNY')!;
   const row={...rows[0],date:t.occurredAt,merchant:t.merchant,amountMinor:t.amount.amountMinor.toString(),direction:t.direction};
   expect(dedupeWalletRows([row],snapshot.transactions).duplicateCount).toBe(1);
 });
});
