export function CountryFlag({ countryCode, className = "w-5 h-4 object-cover rounded-sm border border-zinc-800", style }: { countryCode?: string, className?: string, style?: React.CSSProperties }) {
  if (!countryCode) return null;
  return (
    <img
      src={`https://media.warera.io/images/flags/${countryCode.toLowerCase()}.svg`}
      alt={`${countryCode} flag`}
      className={`inline-block ${className}`}
      style={{ ...style, verticalAlign: 'middle', marginTop: '-2px' }}
      onError={(e) => { e.currentTarget.style.display = 'none'; }}
    />
  );
}
