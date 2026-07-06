export type FotoInformeTecnico = {
  nombre: string;
  url: string;
  etapa?: string;
};

export type DocumentoInformeTecnico = {
  nombre: string;
  url?: string;
  tipo?: string;
  comentario?: string;
};

export type EquipoInformeTecnico = {
  titulo: string;
  detalle?: string;
  equipo?: string;
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
  codigo?: string;
  checklist?: string;
  diagnostico?: string;
  procedimiento?: string;
  repuestos?: string;
  trabajoRealizado?: string;
  repuestosUtilizados?: string;
  pruebaFuncional?: boolean;
  pruebaCarga?: boolean;
  equipoLiberado?: boolean;
  observaciones?: string;
  fotos?: FotoInformeTecnico[];
  documentos?: DocumentoInformeTecnico[];
};

export type InformeTecnicoData = {
  ot?: string;
  cliente?: string;
  contacto?: string;
  fechaIngreso?: string;
  fechaEmision?: string;
  estado?: string;
  resumen?: string;
  observacionesGenerales?: string;
  documentos?: DocumentoInformeTecnico[];
  equipos?: EquipoInformeTecnico[];

  equipoTitulo?: string;
  equipoDetalle?: string;
  procedimiento?: string;
  repuestos?: string;
  horas?: string;
  comentario?: string;
};

function limpiar(valor?: string | number | null) {
  const texto = String(valor ?? "").trim();
  return texto || "No informado";
}

function escapar(valor?: string | number | null) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function textoCaja(valor?: string) {
  return escapar(limpiar(valor));
}

function bloque(titulo: string, contenido?: string) {
  if (!contenido?.trim()) return "";

  return `
    <section class="section">
      <h2>${escapar(titulo)}</h2>
      <div class="box">${escapar(contenido)}</div>
    </section>
  `;
}

function estadoTexto(valor?: boolean) {
  if (valor === true) return "Sí";
  if (valor === false) return "No";
  return "No informado";
}

function fotosHTML(fotos?: FotoInformeTecnico[]) {
  if (!fotos?.length) return "";

  return `
    <section class="section">
      <h2>Registro fotográfico</h2>
      <div class="photos">
        ${fotos
          .map(
            (foto) => `
              <a class="photo" href="${escapar(foto.url)}" target="_blank" rel="noopener noreferrer">
                <img src="${escapar(foto.url)}" alt="${escapar(foto.nombre)}" />
                <span>${escapar(foto.nombre)}</span>
                ${foto.etapa ? `<small>${escapar(foto.etapa)}</small>` : ""}
              </a>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function documentosHTML(documentos?: DocumentoInformeTecnico[]) {
  if (!documentos?.length) return "";

  return `
    <section class="section">
      <h2>Documentos asociados</h2>
      <table>
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Documento</th>
            <th>Comentario</th>
            <th>Archivo</th>
          </tr>
        </thead>
        <tbody>
          ${documentos
            .map(
              (doc) => `
                <tr>
                  <td>${escapar(doc.tipo || "Documento")}</td>
                  <td>${escapar(doc.nombre)}</td>
                  <td>${escapar(doc.comentario || "-")}</td>
                  <td>${doc.url ? `<a href="${escapar(doc.url)}" target="_blank" rel="noopener noreferrer">Abrir</a>` : "No disponible"}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </section>
  `;
}

function datosEquipoHTML(equipo: EquipoInformeTecnico) {
  if (equipo.detalle?.trim()) {
    return `<div class="box">${escapar(equipo.detalle)}</div>`;
  }

  return `
    <table>
      <tbody>
        <tr><td><strong>Equipo</strong></td><td>${escapar(equipo.equipo || equipo.titulo || "-")}</td></tr>
        <tr><td><strong>Marca</strong></td><td>${escapar(equipo.marca || "-")}</td></tr>
        <tr><td><strong>Modelo</strong></td><td>${escapar(equipo.modelo || "-")}</td></tr>
        <tr><td><strong>Serie</strong></td><td>${escapar(equipo.numeroSerie || "-")}</td></tr>
        <tr><td><strong>Código</strong></td><td>${escapar(equipo.codigo || "-")}</td></tr>
      </tbody>
    </table>
  `;
}

function pruebasHTML(equipo: EquipoInformeTecnico) {
  const tienePruebas =
    typeof equipo.pruebaFuncional === "boolean" ||
    typeof equipo.pruebaCarga === "boolean" ||
    typeof equipo.equipoLiberado === "boolean";

  if (!tienePruebas) return "";

  return `
    <section class="section">
      <h2>Pruebas y liberación</h2>
      <table>
        <tbody>
          <tr><td><strong>Prueba funcional</strong></td><td>${estadoTexto(equipo.pruebaFuncional)}</td></tr>
          <tr><td><strong>Prueba de carga</strong></td><td>${estadoTexto(equipo.pruebaCarga)}</td></tr>
          <tr><td><strong>Equipo liberado</strong></td><td>${estadoTexto(equipo.equipoLiberado)}</td></tr>
        </tbody>
      </table>
    </section>
  `;
}

function equipoHTML(equipo: EquipoInformeTecnico, index: number) {
  return `
    <article class="equipment">
      <div class="equipmentHeader">
        <div>
          <span>Equipo ${index + 1}</span>
          <h1>${escapar(equipo.titulo || equipo.equipo || "Equipo")}</h1>
        </div>
      </div>

      <section class="section">
        <h2>Datos del equipo</h2>
        ${datosEquipoHTML(equipo)}
      </section>

      ${bloque("Resultado del checklist", equipo.checklist)}
      ${bloque("Diagnóstico técnico", equipo.diagnostico)}
      ${bloque("Procedimiento sugerido", equipo.procedimiento)}
      ${bloque("Repuestos sugeridos", equipo.repuestos)}
      ${bloque("Trabajo realizado", equipo.trabajoRealizado)}
      ${bloque("Repuestos utilizados", equipo.repuestosUtilizados)}
      ${pruebasHTML(equipo)}
      ${bloque("Observaciones", equipo.observaciones)}
      ${fotosHTML(equipo.fotos)}
      ${documentosHTML(equipo.documentos)}
    </article>
  `;
}

function normalizarData(data: InformeTecnicoData): InformeTecnicoData {
  if (data.equipos?.length) return data;

  return {
    ...data,
    equipos: [
      {
        titulo: data.equipoTitulo || "Equipo 1",
        detalle: data.equipoDetalle,
        procedimiento: data.procedimiento,
        repuestos: data.repuestos,
        observaciones: data.comentario,
      },
    ],
  };
}

export function descargarInformeTecnico(dataOriginal: InformeTecnicoData) {
  const data = normalizarData(dataOriginal);
  const fechaEmision = data.fechaEmision || new Date().toLocaleDateString("es-CL");

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Informe Técnico MJ Industrial</title>
  <style>
    body {
      margin: 0;
      background: #f8fafc;
      color: #0f172a;
      font-family: Arial, sans-serif;
      line-height: 1.45;
    }

    .printButton {
      position: sticky;
      top: 0;
      z-index: 20;
      width: 100%;
      border: 0;
      background: #2563eb;
      color: white;
      padding: 14px 20px;
      font-weight: 900;
      cursor: pointer;
    }

    .page {
      max-width: 980px;
      margin: 0 auto;
      background: white;
      padding: 38px;
      min-height: 100vh;
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
      letter-spacing: .5px;
      margin-bottom: 8px;
    }

    .cover h1 {
      margin: 0;
      color: #1e3a8a;
      font-size: 30px;
    }

    .cover p {
      margin: 8px 0 0;
      color: #64748b;
      font-size: 14px;
    }

    .coverGrid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
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
      color: #64748b;
      text-transform: uppercase;
      font-size: 11px;
      font-weight: 900;
      margin-bottom: 4px;
    }

    .info strong {
      color: #0f172a;
      font-size: 14px;
    }

    .section {
      margin: 22px 0;
    }

    .section h2 {
      color: #1e3a8a;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 7px;
      margin: 0 0 10px;
      font-size: 17px;
    }

    .box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px;
      white-space: pre-wrap;
      font-size: 14px;
    }

    .equipment {
      border: 1px solid #dbeafe;
      border-radius: 18px;
      padding: 20px;
      margin: 26px 0;
      page-break-inside: avoid;
    }

    .equipmentHeader {
      background: #eff6ff;
      border-radius: 14px;
      padding: 14px;
      margin-bottom: 16px;
    }

    .equipmentHeader span {
      display: block;
      color: #2563eb;
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      margin-bottom: 3px;
    }

    .equipmentHeader h1 {
      margin: 0;
      color: #1e3a8a;
      font-size: 22px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-top: 8px;
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
      vertical-align: top;
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

    .photo span,
    .photo small {
      display: block;
      padding: 8px;
      color: #334155;
      font-size: 12px;
    }

    .photo small {
      padding-top: 0;
      color: #64748b;
    }

    .signature {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 42px;
      margin-top: 62px;
    }

    .signature div {
      border-top: 1px solid #0f172a;
      padding-top: 8px;
      text-align: center;
      font-size: 13px;
      font-weight: 800;
    }

    .footer {
      border-top: 1px solid #e2e8f0;
      margin-top: 42px;
      padding-top: 16px;
      text-align: center;
      color: #64748b;
      font-size: 12px;
    }

    @media print {
      .printButton { display: none; }
      body { background: white; }
      .page { max-width: none; padding: 24px; }
      a { color: #1e3a8a; }
    }
  </style>
</head>
<body>
  <button class="printButton" onclick="window.print()">Imprimir / Guardar PDF</button>

  <main class="page">
    <section class="cover">
      <div class="logo">MJ INDUSTRIAL</div>
      <h1>Informe Técnico</h1>
      <p>Documento generado desde el sistema de Servicio Técnico MJ Industrial.</p>

      <div class="coverGrid">
        <div class="info"><span>Orden de trabajo</span><strong>${textoCaja(data.ot)}</strong></div>
        <div class="info"><span>Estado</span><strong>${textoCaja(data.estado)}</strong></div>
        <div class="info"><span>Cliente</span><strong>${textoCaja(data.cliente)}</strong></div>
        <div class="info"><span>Contacto</span><strong>${textoCaja(data.contacto)}</strong></div>
        <div class="info"><span>Fecha ingreso</span><strong>${textoCaja(data.fechaIngreso)}</strong></div>
        <div class="info"><span>Fecha emisión</span><strong>${textoCaja(fechaEmision)}</strong></div>
      </div>
    </section>

    ${data.resumen ? bloque("Resumen técnico", data.resumen) : ""}

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
          ${(data.equipos || [])
            .map(
              (equipo, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${escapar(equipo.titulo || equipo.equipo || "Equipo")}</td>
                  <td>${escapar(equipo.detalle || equipo.codigo || equipo.numeroSerie || "-").replace(/\n/g, "<br />")}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </section>

    ${(data.equipos || []).map((equipo, index) => equipoHTML(equipo, index)).join("")}

    ${documentosHTML(data.documentos)}
    ${bloque("Observaciones generales", data.observacionesGenerales)}

    <section class="signature">
      <div>Servicio Técnico MJ Industrial</div>
      <div>Cliente / Responsable</div>
    </section>

    <div class="footer">MJ Industrial · Informe técnico generado digitalmente.</div>
  </main>
</body>
</html>
`;

  const ventana = window.open("", "_blank");

  if (!ventana) {
    alert("No se pudo abrir el informe. Revisa si el navegador bloqueó ventanas emergentes.");
    return;
  }

  ventana.document.open();
  ventana.document.write(html);
  ventana.document.close();
}
