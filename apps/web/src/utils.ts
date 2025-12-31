
import { DeliverableStatus, ProjectStatus, TimeEntry } from './types';

export const HOURS_PER_DAY = 8;

export const hoursToDays = (hours: number): number => {
  return hours / HOURS_PER_DAY;
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
};

export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

export const getMonthName = (month: number): string => {
  return new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date(2024, month, 1));
};

export const calculateATMonthTotals = (entries: TimeEntry[], type: 'BO' | 'SITE') => {
  const hours = entries
    .filter(e => e.type === type)
    .reduce((acc, curr) => acc + curr.hours, 0);
  return {
    hours,
    days: hoursToDays(hours)
  };
};

export const projectStatusLabel = (status: ProjectStatus) => {
  switch (status) {
    case ProjectStatus.PREVU:
      return 'Prevu';
    case ProjectStatus.EN_COURS:
      return 'En cours';
    case ProjectStatus.CLOS:
      return 'Clos';
    case ProjectStatus.ARCHIVE:
      return 'Archive';
    default:
      return status;
  }
};

export const deliverableStatusLabel = (status: DeliverableStatus) => {
  switch (status) {
    case DeliverableStatus.NON_REMIS:
      return 'Non remis';
    case DeliverableStatus.REMIS:
      return 'Remis';
    case DeliverableStatus.VALIDE:
      return 'Valide';
    default:
      return status;
  }
};
