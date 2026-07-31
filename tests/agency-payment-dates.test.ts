import { deriveAgencyDates, parsePaymentDates } from '../examples/contacts-update-agency-payment-dates';

describe('parsePaymentDates', () => {
  it('разбирает список дат из колонки "Даты оплат"', () => {
    expect(parsePaymentDates('21-08-2024, 31-08-2024, 26-08-2024')).toEqual([
      '21-08-2024',
      '31-08-2024',
      '26-08-2024',
    ]);
  });

  it('выбрасывает мусор и дубли', () => {
    expect(parsePaymentDates(' 01-02-2026 ,, 01-02-2026, дата, 03-04-2026')).toEqual([
      '01-02-2026',
      '03-04-2026',
    ]);
  });

  it('на пустой строке возвращает пустой список', () => {
    expect(parsePaymentDates('')).toEqual([]);
  });
});

describe('deriveAgencyDates', () => {
  it('берёт первую, предпоследнюю и последнюю дату', () => {
    const r = deriveAgencyDates(['10-01-2026', '05-03-2026', '01-07-2026']);
    expect(r.first).toBe('10-01-2026');
    expect(r.prev).toBe('05-03-2026');
    expect(r.last).toBe('01-07-2026');
  });

  it('сортирует даты сама, порядок в отчёте произвольный', () => {
    const r = deriveAgencyDates(['01-07-2026', '10-01-2026', '05-03-2026']);
    expect(r.first).toBe('10-01-2026');
    expect(r.prev).toBe('05-03-2026');
    expect(r.last).toBe('01-07-2026');
  });

  it('единственная оплата: первая = последняя, предпоследней нет', () => {
    const r = deriveAgencyDates(['01-07-2026']);
    expect(r.first).toBe('01-07-2026');
    expect(r.prev).toBeNull();
    expect(r.last).toBe('01-07-2026');
  });

  it('пустой список: все даты пустые', () => {
    expect(deriveAgencyDates([])).toEqual({ first: null, prev: null, last: null, revived: null });
  });

  it('ставит дату возрождения при разрыве больше 180 дней после 2026-06-01', () => {
    const r = deriveAgencyDates(['01-06-2025', '01-07-2026']);
    expect(r.revived).toBe('01-07-2026');
  });

  it('не ставит дату возрождения при разрыве меньше 180 дней', () => {
    const r = deriveAgencyDates(['01-05-2026', '01-07-2026']);
    expect(r.revived).toBeNull();
  });

  it('не ставит дату возрождения, если разрыв закончился до 2026-06-01', () => {
    const r = deriveAgencyDates(['01-01-2024', '15-01-2026']);
    expect(r.revived).toBeNull();
  });

  it('при нескольких возрождениях берёт последнее', () => {
    const r = deriveAgencyDates(['01-01-2024', '01-06-2026', '10-06-2026', '20-01-2027']);
    expect(r.revived).toBe('20-01-2027');
  });
});
