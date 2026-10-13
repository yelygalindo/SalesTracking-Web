const moneyFormat = new Intl.NumberFormat("es-BO", {
  style: "currency",
  currency: "BOB",
});

/** Amounts are stored in bolivianos; "—" when there is none. */
export const formatMoney = (value?: number | null) =>
  value == null ? "—" : moneyFormat.format(value);
