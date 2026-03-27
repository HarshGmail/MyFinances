export interface SalaryRecord {
  baseSalary: number;
  effectiveDate: string;
  notes?: string;
}

export interface MonthlyPayment {
  month: string;
  baseAmount: number;
  bonus: number;
  arrears: number;
  totalPaid: number;
  notes?: string;
}

export const convertToISODate = (dateStr: string) => {
  if (dateStr.length !== 8) return '';
  const day = dateStr.substring(0, 2);
  const month = dateStr.substring(2, 4);
  const year = dateStr.substring(4, 8);
  return `${year}-${month}-${day}`;
};

export const convertFromISODate = (isoDate: string) => {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}${month}${year}`;
};

export const getUserInitials = (name: string, email: string) => {
  if (name)
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  return email.split('@')[0].slice(0, 2).toUpperCase();
};
