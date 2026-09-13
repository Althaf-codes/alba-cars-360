export const formatAlbaNumber = (value: number) => new Intl.NumberFormat('en-AE', { maximumFractionDigits: 0 }).format(value)
export const formatAlbaMoney = (value: number) => `AED ${formatAlbaNumber(value)}`
export const formatAlbaMonthly = (value: number) => `${formatAlbaMoney(value)}/Month`
