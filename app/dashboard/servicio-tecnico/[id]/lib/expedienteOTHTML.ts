type DocumentoAdjunto = {
  nombre: string;
  url?: string;
  tipo?: string;
};

type FotoAdjunta = {
  nombre: string;
  url: string;
  etapa?: string;
};

type EquipoExpediente = {
  titulo: string;
  detalle: string;
  checklist?: string;
  diagnostico?: string;
  procedimiento?: string;
  repuestos?: string;
  trabajo?: string;
  observaciones?: string;
  fotos?: FotoAdjunta[];
};

type ExpedienteOTData = {
  ot: string;
  cliente?: string;
  contacto?: string;
  fechaIngreso?: string;
  fechaEmision?: string;
  estado?: string;
  resumen?: string;
  equipos: EquipoExpediente[];
  documentos?: DocumentoAdjunto[];
  observacionesFinales?: string;
};

function textoSeguro(valor?: string) {
  return valor?.trim() || "No informado";
}

function bloque(titulo: string, contenido?: string) {
  return `
    <section class="section">
      <h2>${titulo}</h2>
      <div class="box">${textoSeguro(contenido)}</div>
    </section>
  `;
}

function fotosHTML(fotos?: FotoAdjunta[]) {
  if (!fotos?.length) return "";

  return `
    <section class="section">
      <h2>Fotografías</h2>
      <div class="photos">
        ${fotos
          .map(
            (foto) => `
              <a href="${foto.url}" target="_blank" class="photo">
                <img src="${foto.url}" alt="${foto.nombre}" />
                <span>${foto.nombre}</span>
              </a>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function documentosHTML(documentos?: DocumentoAdjunto[]) {
  if (!documentos?.length) return "";

  return `
    <section class="section">
      <h2>Documentos asociados</h2>
      <table>
        <thead>
          <tr>
            <th>Documento</th>
            <th>Tipo</th>
            <th>Archivo</th>
          </tr>
        </thead>
        <tbody>
          ${documentos
            .map(
              (doc) => `
                <tr>
                  <td>${doc.nombre}</td>
                  <td>${doc.tipo || "Documento"}</td>
                  <td>
                    ${
                      doc.url
                        ? `<a href="${doc.url}" target="_blank">Abrir documento</a>`
                        : "No disponible"
                    }
                  </td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </section>
  `;
}

function equipoHTML(equipo: EquipoExpediente, index: number) {
  return `
    <section class="equipo">
      <div class="equipoHeader">
        <div>
          <h1>Equipo ${index + 1}</h1>
          <p>${equipo.titulo}</p>
        </div>
      </div>

      ${bloque("Datos del equipo", equipo.detalle)}
      ${equipo.checklist ? bloque("Resultado del checklist", equipo.checklist) : ""}
      ${equipo.diagnostico ? bloque("Diagnóstico técnico", equipo.diagnostico) : ""}
      ${equipo.procedimiento ? bloque("Procedimiento recomendado", equipo.procedimiento) : ""}
      ${equipo.repuestos ? bloque("Repuestos sugeridos / utilizados", equipo.repuestos) : ""}
      ${equipo.trabajo ? bloque("Trabajo realizado", equipo.trabajo) : ""}
      ${equipo.observaciones ? bloque("Observaciones", equipo.observaciones) : ""}
      ${fotosHTML(equipo.fotos)}
    </section>
  `;
}

export function descargarExpedienteOT(data: ExpedienteOTData) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Expediente Técnico ${data.ot}</title>

  <style>
    body {
      font-family: Arial, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      padding: 0;
      margin: 0;
      line-height: 1.45;
    }

    .page {
      max-width: 980px;
      margin: 0 auto;
      background: white;
      padding: 38px;
    }

    .printButton {
      position: sticky;
      top: 0;
      z-index: 10;
      width: 100%;
      background: #2563eb;
      color: white;
      border: none;
      padding: 14px;
      font-weight: 900;
      cursor: pointer;
      font-size: 14px;
    }

    .cover {
      border-bottom: 4px solid #1e3a8a;
      padding-bottom: 24px;
      margin-bottom: 28px;
    }

    .logo {
      font-size: 24px;
      font-weight: 900;
      color: #0f172a;
      margin-bottom: 10px;
      letter-spacing: .5px;
    }

    .cover h1 {
      margin: 0;
      color: #1e3a8a;
      font-size: 30px;
    }

    .coverGrid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-top: 22px;
    }

    .info {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px;
    }

    .info span {
      display: block;
      font-size: 11px;
      font-weight: 900;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .info strong {
      font-size: 14px;
      color: #0f172a;
    }

    .section {
      margin: 22px 0;
    }

    .section h2 {
      font-size: 17px;
      color: #1e3a8a;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 6px;
      margin-bottom: 10px;
    }

    .box {
      white-space: pre-wrap;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px;
      font-size: 14px;
    }

    .equipo {
      page-break-inside: avoid;
      border: 1px solid #dbeafe;
      border-radius: 18px;
      padding: 20px;
      margin-top: 26px;
    }

    .equipoHeader {
      background: #eff6ff;
      border-radius: 14px;
      padding: 14px;
      margin-bottom: 16px;
    }

    .equipoHeader h1 {
      margin: 0;
      color: #1e3a8a;
      font-size: 22px;
    }

    .equipoHeader p {
      margin: 4px 0 0;
      font-weight: 800;
      color: #334155;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 13px;
    }

    th {
      background: #eff6ff;
      color: #1e3a8a;
      text-align: left;
      padding: 9px;
    }

    td {
      border-top: 1px solid #e2e8f0;
      padding: 9px;
    }

    a {
      color: #2563eb;
      font-weight: 800;
      text-decoration: none;
    }

    .photos {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    .photo {
      display: block;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      background: white;
    }

    .photo img {
      width: 100%;
      height: 150px;
      object-fit: cover;
      display: block;
    }

    .photo span {
      display: block;
      padding: 8px;
      font-size: 12px;
      color: #334155;
    }

    .firma {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 40px;
      margin-top: 60px;
    }

    .firma div {
      border-top: 1px solid #0f172a;
      padding-top: 8px;
      text-align: center;
      font-size: 13px;
      font-weight: 800;
    }

    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #64748b;
      text-align: center;
    }

    @media print {
      .printButton {
        display: none;
      }

      body {
        background: white;
      }

      .page {
        padding: 24px;
        max-width: none;
      }
    }
  </style>
</head>

<body>
  <button class="printButton" onclick="window.print()">
    Imprimir / Guardar PDF
  </button>

  <main class="page">
    <section class="cover">
      <div class="logo">MJ INDUSTRIAL</div>
      <h1>Expediente Técnico de Servicio</h1>

      <div class="coverGrid">
        <div class="info">
          <span>Orden de trabajo</span>
          <strong>${textoSeguro(data.ot)}</strong>
        </div>

        <div class="info">
          <span>Estado</span>
          <strong>${textoSeguro(data.estado)}</strong>
        </div>

        <div class="info">
          <span>Cliente</span>
          <strong>${textoSeguro(data.cliente)}</strong>
        </div>

        <div class="info">
          <span>Contacto</span>
          <strong>${textoSeguro(data.contacto)}</strong>
        </div>

        <div class="info">
          <span>Fecha ingreso</span>
          <strong>${textoSeguro(data.fechaIngreso)}</strong>
        </div>

        <div class="info">
          <span>Fecha emisión</span>
          <strong>${textoSeguro(data.fechaEmision)}</strong>
        </div>
      </div>
    </section>

    ${data.resumen ? bloque("Resumen ejecutivo de la OT", data.resumen) : ""}

    <section class="section">
      <h2>Resumen de equipos</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Equipo</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          ${data.equipos
            .map(
              (equipo, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${equipo.titulo}</td>
                  <td>${equipo.detalle.replace(/\n/g, "<br />")}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </section>

    ${data.equipos.map((equipo, index) => equipoHTML(equipo, index)).join("")}

    ${documentosHTML(data.documentos)}

    ${data.observacionesFinales ? bloque("Observaciones finales", data.observacionesFinales) : ""}

    <section class="firma">
      <div>Servicio Técnico MJ Industrial</div>
      <div>Cliente / Responsable</div>
    </section>

    <div class="footer">
      MJ Industrial · Expediente técnico generado digitalmente.
    </div>
  </main>
</body>
</html>
`;

  const ventana = window.open("", "_blank");

  if (!ventana) {
    alert("No se pudo abrir el expediente. Revisa si el navegador bloqueó ventanas emergentes.");
    return;
  }

  ventana.document.open();
  ventana.document.write(html);
  ventana.document.close();
}