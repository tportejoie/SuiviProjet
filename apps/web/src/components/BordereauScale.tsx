export const computeBordereauScale = (contentHeight: number, pageHeight: number) => {
  if (contentHeight <= 0 || pageHeight <= 0) return 1;
  return Math.min(1, pageHeight / contentHeight);
};
