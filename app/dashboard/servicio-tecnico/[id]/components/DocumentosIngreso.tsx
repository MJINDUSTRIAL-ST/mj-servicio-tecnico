type Documento = {
  id: string;
  nombre?: string |null;
  tipo?: string |null;
  url?: string |null;
};

type Props = {
  documentos: Documento[];
};

function nombre(tipo?: string | null) {
  switch (tipo) {
    case "orden-compra":
      return "Orden de Compra";
    case "cotizacion":
      return "Cotización";
    case "informe-recibido":
      return "Informe recibido";
    default:
      return "Documento";
  }
}

export default function DocumentosIngreso({
  documentos,
}: Props) {
  return (
    <section className="card">

      <h2>Documentos de ingreso</h2>

      {documentos.length === 0 ? (
        <div className="empty">
          No hay documentos.
        </div>
      ) : (
        <div className="lista">

          {documentos.map((doc)=>(
            <div
              key={doc.id}
              className="item"
            >

              <div>

                <strong>
                  {nombre(doc.tipo)}
                </strong>

                <div className="sub">
                  {doc.nombre}
                </div>

              </div>

              {doc.url && (

                <a
                  href={doc.url}
                  target="_blank"
                >
                  Ver PDF
                </a>

              )}

            </div>
          ))}

        </div>
      )}

<style jsx>{`

.card{
background:white;
border-radius:18px;
padding:20px;
border:1px solid #e2e8f0;
margin-bottom:18px;
}

h2{
margin:0 0 18px;
font-size:18px;
}

.empty{
color:#64748b;
}

.lista{
display:grid;
gap:12px;
}

.item{
display:flex;
justify-content:space-between;
align-items:center;
padding:14px;
border-radius:12px;
background:#f8fafc;
border:1px solid #e2e8f0;
}

.sub{
margin-top:4px;
font-size:13px;
color:#64748b;
}

a{
background:#2563eb;
color:white;
padding:10px 14px;
border-radius:10px;
text-decoration:none;
font-weight:700;
}

`}</style>

    </section>
  );
}