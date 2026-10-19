/** Visually hidden table so every chart's data is available to screen readers. */
export function DataTable({ caption, columns, rows }: { caption: string; columns: string[]; rows: (string | number)[][] }) {
  return (
    // Tables ignore width:1px, so the sr-only clip goes on a wrapper.
    <div className="sr-only">
    <table>
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c} scope="col">{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((v, j) => (j === 0 ? <th key={j} scope="row">{v}</th> : <td key={j}>{v}</td>))}
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
