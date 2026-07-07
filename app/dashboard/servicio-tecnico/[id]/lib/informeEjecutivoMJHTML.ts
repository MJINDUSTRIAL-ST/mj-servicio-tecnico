export type FotoInformeMJ = {
  nombre: string;
  url: string;
};

export type EquipoInformeMJ = {
  titulo: string;
  tipo?: string;
  marca?: string;
  modelo?: string;
  serie?: string;
  capacidad?: string;
  hallazgos?: string;
  trabajosRequeridos?: string[];
  estadoFinal?: "apto" | "observaciones" | "no_apto";
  fotos?: FotoInformeMJ[];
};

export type InformeEjecutivoMJData = {
  ot: string;
  cliente?: string;
  empresa?: string;
  contacto?: string;
  fechaIngreso?: string;
  fechaEmision?: string;
  tecnico?: string;
  estado?: string;
  equipos: EquipoInformeMJ[];
};

function texto(valor?: string) {
  return valor?.trim() || "-";
}

function estadoTexto(estado?: EquipoInformeMJ["estadoFinal"]) {
  if (estado === "apto") return "APTO PARA OPERACIÓN";
  if (estado === "observaciones") return "APTO CON OBSERVACIONES";
  if (estado === "no_apto") return "NO APTO PARA OPERACIÓN";
  return "PENDIENTE DE DEFINIR";
}

function estadoClase(estado?: EquipoInformeMJ["estadoFinal"]) {
  if (estado === "apto") return "apto";
  if (estado === "observaciones") return "obs";
  if (estado === "no_apto") return "noApto";
  return "pendiente";
}

function fotosHTML(fotos?: FotoInformeMJ[]) {
  if (!fotos?.length) return "";

  return `
    <section class="bloque">
      <h3>Fotografías</h3>
      <div class="fotos">
        ${fotos
          .slice(0, 6)
          .map(
            (foto) => `
              <a href="${foto.url}" target="_blank" class="foto">
                <img src="${foto.url}" />
                <span>${foto.nombre}</span>
              </a>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function equipoHTML(equipo: EquipoInformeMJ, index: number) {
  return `
    <article class="equipo">
      <div class="equipoHeader">
        <div>
          <p class="eyebrow">Equipo ${index + 1}</p>
          <h2>${texto(equipo.titulo)}</h2>
        </div>
        <div class="estado ${estadoClase(equipo.estadoFinal)}">
          ${estadoTexto(equipo.estadoFinal)}
        </div>
      </div>

      <section class="datosEquipo">
        <div><span>Tipo</span><strong>${texto(equipo.tipo)}</strong></div>
        <div><span>Marca</span><strong>${texto(equipo.marca)}</strong></div>
        <div><span>Modelo</span><strong>${texto(equipo.modelo)}</strong></div>
        <div><span>Serie</span><strong>${texto(equipo.serie)}</strong></div>
        <div><span>Capacidad</span><strong>${texto(equipo.capacidad)}</strong></div>
      </section>

      <section class="bloque">
        <h3>Hallazgos</h3>
        <p>${texto(equipo.hallazgos)}</p>
      </section>

      ${
        equipo.trabajosRequeridos?.length
          ? `
            <section class="bloque">
              <h3>Trabajos requeridos</h3>
              <ul>
                ${equipo.trabajosRequeridos
                  .filter(Boolean)
                  .slice(0, 8)
                  .map((item) => `<li>${item}</li>`)
                  .join("")}
              </ul>
            </section>
          `
          : ""
      }

      ${fotosHTML(equipo.fotos)}
    </article>
  `;
}

export function descargarInformeEjecutivoMJ(data: InformeEjecutivoMJData) {
  const totalEquipos = data.equipos.length;
  const noAptos = data.equipos.filter(
    (equipo) => equipo.estadoFinal === "no_apto"
  ).length;
  const conObs = data.equipos.filter(
    (equipo) => equipo.estadoFinal === "observaciones"
  ).length;
  const aptos = data.equipos.filter(
    (equipo) => equipo.estadoFinal === "apto"
  ).length;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Informe Técnico ${data.ot}</title>

  <style>
    body {
      margin: 0;
      background: #eef2f7;
      color: #0f172a;
      font-family: Arial, sans-serif;
      line-height: 1.45;
    }

    .printButton {
      position: sticky;
      top: 0;
      z-index: 20;
      width: 100%;
      border: none;
      background: #1d4ed8;
      color: white;
      padding: 14px;
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

    .header {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      border-bottom: 4px solid #1e3a8a;
      padding-bottom: 22px;
      margin-bottom: 24px;
    }

    .logo {
      font-size: 24px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: .5px;
    }

    .titulo {
      margin-top: 10px;
      font-size: 30px;
      font-weight: 900;
      color: #1e3a8a;
    }

    .meta {
      text-align: right;
      font-size: 13px;
      color: #334155;
    }

    .meta strong {
      display: block;
      font-size: 22px;
      color: #0f172a;
      margin-bottom: 8px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 22px;
    }

    .card {
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      background: #f8fafc;
      padding: 14px;
    }

    .card span,
    .datosEquipo span {
      display: block;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 4px;
    }

    .card strong,
    .datosEquipo strong {
      font-size: 14px;
      color: #0f172a;
    }

    .resumen {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin: 24px 0;
    }

    .metric {
      border-radius: 14px;
      padding: 16px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      text-align: center;
    }

    .metric strong {
      display: block;
      font-size: 28px;
      color: #1e3a8a;
    }

    .metric span {
      font-size: 11px;
      font-weight: 900;
      color: #475569;
      text-transform: uppercase;
    }

    .equipo {
      page-break-inside: avoid;
      border: 1px solid #cbd5e1;
      border-radius: 20px;
      padding: 22px;
      margin-top: 28px;
    }

    .equipoHeader {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      align-items: flex-start;
      background: #f8fafc;
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 18px;
    }

    .eyebrow {
      margin: 0;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      color: #64748b;
    }

    h2 {
      margin: 4px 0 0;
      color: #1e3a8a;
      font-size: 24px;
    }

    h3 {
      margin: 0 0 10px;
      color: #1e3a8a;
      font-size: 16px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
    }

    .estado {
      border-radius: 999px;
      padding: 10px 14px;
      font-size: 11px;
      font-weight: 900;
      white-space: nowrap;
    }

    .apto {
      background: #dcfce7;
      color: #166534;
    }

    .obs {
      background: #fef9c3;
      color: #854d0e;
    }

    .noApto {
      background: #fee2e2;
      color: #991b1b;
    }

    .pendiente {
      background: #e2e8f0;
      color: #475569;
    }

    .datosEquipo {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 10px;
      margin-bottom: 18px;
    }

    .datosEquipo div {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px;
    }

    .bloque {
      margin-top: 18px;
    }

    .bloque p {
      margin: 0;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px;
      white-space: pre-wrap;
      font-size: 14px;
    }

    ul {
      margin: 0;
      padding: 14px 18px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      font-size: 14px;
    }

    li {
      margin: 6px 0;
    }

    .fotos {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    .foto {
      display: block;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      text-decoration: none;
      color: #334155;
      background: white;
    }

    .foto img {
      width: 100%;
      height: 145px;
      object-fit: cover;
      display: block;
    }

    .foto span {
      display: block;
      padding: 8px;
      font-size: 11px;
      font-weight: 700;
    }

    .firmas {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 60px;
      margin-top: 60px;
    }

    .firma {
      border-top: 1px solid #0f172a;
      padding-top: 10px;
      text-align: center;
      font-size: 13px;
      font-weight: 800;
    }

    .footer {
      margin-top: 40px;
      padding-top: 14px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 12px;
    }

    @media print {
      .printButton {
        display: none;
      }

      body {
        background: white;
      }

      .page {
        max-width: none;
        padding: 24px;
      }

      .equipo {
        page-break-inside: avoid;
      }
    }
  </style>
</head>

<body>
  <button class="printButton" onclick="window.print()">
    Imprimir / Guardar PDF
  </button>

  <main class="page">
    <header class="header">
      <div>
        <div class="logo">MJ INDUSTRIAL</div>
        <div class="titulo">INFORME TÉCNICO</div>
      </div>

      <div class="meta">
        <strong>${texto(data.ot)}</strong>
        Estado: ${texto(data.estado)}<br />
        Fecha ingreso: ${texto(data.fechaIngreso)}<br />
        Fecha emisión: ${texto(data.fechaEmision)}
      </div>
    </header>

    <section class="grid">
      <div class="card">
        <span>Cliente</span>
        <strong>${texto(data.cliente)}</strong>
      </div>

      <div class="card">
        <span>Empresa</span>
        <strong>${texto(data.empresa)}</strong>
      </div>

      <div class="card">
        <span>Contacto</span>
        <strong>${texto(data.contacto)}</strong>
      </div>

      <div class="card">
        <span>Técnico responsable</span>
        <strong>${texto(data.tecnico)}</strong>
      </div>
    </section>

    ${
      totalEquipos > 1
        ? `
          <section class="resumen">
            <div class="metric">
              <strong>${totalEquipos}</strong>
              <span>Equipos</span>
            </div>
            <div class="metric">
              <strong>${aptos}</strong>
              <span>Aptos</span>
            </div>
            <div class="metric">
              <strong>${conObs}</strong>
              <span>Con observaciones</span>
            </div>
            <div class="metric">
              <strong>${noAptos}</strong>
              <span>No aptos</span>
            </div>
          </section>
        `
        : ""
    }

    ${data.equipos.map((equipo, index) => equipoHTML(equipo, index)).join("")}

    <section class="firmas">
      <div class="firma">Servicio Técnico MJ Industrial</div>
      <div class="firma">Cliente / Responsable</div>
    </section>

    <div class="footer">
      MJ Industrial · www.mjindustrial.cl · Informe generado digitalmente
    </div>
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