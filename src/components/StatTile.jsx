export default function StatTile({ label, value, hint }) {
  return (
    <div className="stat-tile">
      <dt>{label}</dt>
      <dd>{value}</dd>
      {hint && <p className="stat-hint">{hint}</p>}
    </div>
  );
}
