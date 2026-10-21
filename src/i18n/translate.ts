import messages from './zh-CN.json';

export type Language = 'en' | 'zh-CN';
const catalog: Readonly<Record<string, string>> = messages;
const folded = new Map(Object.entries(catalog).map(([en, zh]) => [en.toLowerCase(), zh]));

// Templates are anchored to whole UI messages: names, IDs, amounts and currency codes remain data.
const templates: readonly [RegExp, (...values: string[]) => string][] = [
  [/^Daily budget remaining: (.+) \/ day$/, value => `每日剩余预算：${value} / 天`],
  [/^Unusual (.+) spending$/, category => `${translateText(category,'zh-CN')}消费异常`],
  [/^Median of (\d+) earlier category transactions \(90-day window\)(?:: (.+))?$/, (count,value) => `过去90天内${count}笔更早同类交易的中位数${value?`：${value}`:''}`],
  [/^(.+) has no recorded usage\.$/, name => `${translateText(name, 'zh-CN')}暂无使用记录。`],
  [/^Mean of (\d+) other observed category transactions(?:: (.+))?$/, (count,value) => `其他 ${count} 笔同类交易的均值${value?`：${value}`:''}`],
  [/^(Up|Down|Unchanged) (.+) percent$/, (direction,value) => `${translateText(direction, 'zh-CN')} ${value}%`],
  [/^compared with (\d{4}-\d{2}-\d{2})$/, date => `与 ${date} 比较`],
  [/^Published (\d{4}-\d{2}-\d{2})$/, date => `公布日期 ${date}`],
  [/^Until (.+) on (\d{4}-\d{2}-\d{2})$/, (name,date) => `截至 ${date} ${translateText(name, 'zh-CN')} 到账前`],
  [/^(.+)% funded$/, value => `已筹集 ${value}%`],
  [/^(.+)% cash allocation$/, value => `现金配置 ${value}%`],
  [/^(.+)% used$/, value => `已使用 ${value}%`],
  [/^Good morning, (.+)$/, name => `早上好，${name}`],
  [/^Good afternoon, (.+)$/, name => `下午好，${name}`],
  [/^Good evening, (.+)$/, name => `晚上好，${name}`],
  [/^Welcome, (.+)$/, name => `欢迎，${name}`],
  [/^Available ([A-Z]{3} [\d,.]+)$/,  value => `可用余额 ${value}`],
  [/^CNY reference: (.+)$/, value => `人民币参考金额：${value}`],
  [/^Savings goal: (.+)$/, value => `储蓄目标：${value}`],
  [/^([\d,.]+) months$/, value => `${value} 个月`],
  [/^([\d,.]+) days$/, value => `${value} 天`],
  [/^(\d+) accounts?$/, value => `${value} 个账户`],
  [/^(\d+) active accounts$/, value => `${value} 个正常账户`],
  [/^(\d+) financial alerts?$/, value => `${value} 条财务提醒`],
  [/^(\d+) to review$/, value => `${value} 项待查看`],
  [/^Your accounts · (\d+) accounts$/, value => `您的账户 · ${value} 个账户`],
  [/^(.+) · due (\d{4}-\d{2}-\d{2})$/, (value,date) => `${translateText(value, 'zh-CN')} · 到期日 ${date}`],
  [/^(.+) saved towards (.+)\.$/, (saved,goal) => `已存 ${saved}，目标为 ${goal}。`],
  [/^Next bill: (.+)$/, value => `下一笔账单：${translateText(value, 'zh-CN')}`],
  [/^Showing (\d+) of (\d+)(.*)$/, (count,total,rest) => `显示 ${total} 项中的 ${count} 项${translateText(rest, 'zh-CN')}`],
];

export function translateText(text: string, language: Language): string {
  if (language === 'en' || !/[A-Za-z]/.test(text)) return text;
  const clean = text.replace(/\s+/g, ' ').trim();
  const direct = catalog[clean] ?? folded.get(clean.toLowerCase());
  let result = direct;
  if (result === undefined) {
    for (const [pattern, render] of templates) {
      const match = pattern.exec(clean);
      if (match) { result = render(...match.slice(1)); break; }
    }
  }
  if (result === undefined && clean.includes(' · ')) {
    const parts=clean.split(' · ');const translated=parts.map(part=>translateText(part,language));
    if(translated.some((part,i)=>part!==parts[i])) result=translated.join(' · ');
  }
  if (result === undefined && clean.includes(' / ')) {
    const parts=clean.split(' / ');const translated=parts.map(part=>translateText(part,language));
    if(translated.some((part,i)=>part!==parts[i])) result=translated.join(' / ');
  }
  if (result === undefined) {
    const label= /^([^:]+): (.+)$/.exec(clean);
    if(label){const heading=translateText(label[1]+':',language);if(heading!==label[1]+':')result=`${heading}${translateText(label[2],language)}`;}
  }
  if (result === undefined) return text;
  return `${/^\s/.test(text) ? ' ' : ''}${result}${/\s$/.test(text) ? ' ' : ''}`;
}
