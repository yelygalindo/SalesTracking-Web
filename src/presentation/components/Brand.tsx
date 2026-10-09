export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className={`brand${inverse ? " brand--inverse" : ""}`}>
      <img
        className="brand-logo"
        src="/urbantrack-icon.svg"
        alt=""
        width="48"
        height="48"
      />
      <div className="brand-copy">
        <span className="brand-name">UrbanTrack</span>
        <small>CRM + operación en campo</small>
      </div>
    </div>
  );
}
