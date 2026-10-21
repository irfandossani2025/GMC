export function addValidityMonths(start: Date, months: number): Date {
  const result = new Date(start); const day = result.getUTCDate();
  result.setUTCDate(1); result.setUTCMonth(result.getUTCMonth()+months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(),result.getUTCMonth()+1,0)).getUTCDate();
  result.setUTCDate(Math.min(day,lastDay)); return result;
}
export function sessionDateBounds(from?: string | null, to?: string | null) {
  const parse = (value: string) => {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('Enter a valid date range.');
    const date = new Date(`${value}T00:00:00+04:00`);
    if(!Number.isFinite(date.getTime()) || new Date(date.getTime()+4*3600000).toISOString().slice(0,10)!==value)throw new Error('Enter a valid date range.');
    return date;
  };
  const start = from ? parse(from) : undefined, end = to ? parse(to) : undefined;
  if(start && end && start>end)throw new Error('The start date must be before the end date.');
  return {...(start ? {gte:start}:{}),...(end ? {lt:new Date(end.getTime()+24*3600000)}:{})};
}
export function positivePage(value: string | null, fallback: number, maximum = 1000000): number {
  const number = Number(value); return Number.isSafeInteger(number) && number>0 ? Math.min(number,maximum) : fallback;
}
