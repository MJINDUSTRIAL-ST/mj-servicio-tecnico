export type FotoInformeTecnico = {
  nombre?: string;
  url?: string;
  etapa?: string;
  itemLabel?: string;
  observacion?: string;

  // Compatibilidad con nombres usados en distintas tablas/componentes.
  name?: string;
  filename?: string;
  foto_url?: string;
  publicUrl?: string;
  public_url?: string;
  preview?: string;
  src?: string;
  storage_path?: string;
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
  capacidad?: string;
  accesorios?: string;

  problemaReportado?: string;
  observacionesIngreso?: string;

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
  fotosIngreso?: FotoInformeTecnico[];
  fotosChecklist?: FotoInformeTecnico[];
  otrasFotosChecklist?: FotoInformeTecnico[];
  fotosTrabajo?: FotoInformeTecnico[];

  documentos?: DocumentoInformeTecnico[];
  documentosTrabajo?: DocumentoInformeTecnico[];
};

export type InformeTecnicoData = {
  ot?: string;
  cliente?: string;
  contacto?: string;
  empresa?: string;
  tecnicoResponsable?: string;
  fechaIngreso?: string;
  fechaEmision?: string;
  estado?: string;

  problemaReportado?: string;
  observacionesIngreso?: string;
  resumen?: string;
  observacionesGenerales?: string;

  fotos?: FotoInformeTecnico[];
  fotosIngreso?: FotoInformeTecnico[];
  fotosChecklist?: FotoInformeTecnico[];
  otrasFotosChecklist?: FotoInformeTecnico[];
  fotosTrabajo?: FotoInformeTecnico[];

  documentos?: DocumentoInformeTecnico[];
  documentosTrabajo?: DocumentoInformeTecnico[];

  equipos?: EquipoInformeTecnico[];

  // Compatibilidad con versión antigua.
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

function textoCaja(valor?: string | number | null) {
  return escapar(limpiar(valor));
}

function bloque(titulo: string, contenido?: string | null) {
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

function textoValido(valor?: string | null) {
  const limpio = String(valor ?? "").trim();
  if (!limpio) return "";
  if (limpio === "-") return "";
  if (limpio.toLowerCase() === "no informado") return "";
  if (limpio.toLowerCase() === "sin registro") return "";
  return limpio;
}

function normalizarFoto(foto: FotoInformeTecnico | string, etapaDefault?: string): FotoInformeTecnico | null {
  if (typeof foto === "string") {
    const urlString = foto.trim();
    if (!urlString) return null;
    return {
      nombre: "Foto",
      url: urlString,
      etapa: etapaDefault,
    };
  }

  const url =
    foto.url ||
    foto.foto_url ||
    foto.publicUrl ||
    foto.public_url ||
    foto.preview ||
    foto.src ||
    "";

  const urlLimpia = String(url).trim();
  if (!urlLimpia) return null;

  const nombre =
    foto.nombre ||
    foto.name ||
    foto.filename ||
    foto.itemLabel ||
    foto.etapa ||
    "Foto";

  return {
    ...foto,
    nombre,
    url: urlLimpia,
    etapa: foto.etapa || etapaDefault,
  };
}

function normalizarFotos(fotos?: FotoInformeTecnico[] | string[], etapaDefault?: string) {
  const normalizadas = (fotos || [])
    .map((foto) => normalizarFoto(foto, etapaDefault))
    .filter(Boolean) as FotoInformeTecnico[];

  const vistas = new Set<string>();

  return normalizadas.filter((foto) => {
    const clave = `${foto.url}|${foto.nombre}|${foto.etapa || ""}`;
    if (vistas.has(clave)) return false;
    vistas.add(clave);
    return true;
  });
}

function separarFotosPorEtapa(fotos?: FotoInformeTecnico[]) {
  const todas = normalizarFotos(fotos);

  const esIngreso = (foto: FotoInformeTecnico) => {
    const texto = `${foto.etapa || ""} ${foto.nombre || ""}`.toLowerCase();
    return texto.includes("ingreso") || texto.includes("inicial") || texto.includes("recepción") || texto.includes("recepcion");
  };

  const esTrabajo = (foto: FotoInformeTecnico) => {
    const texto = `${foto.etapa || ""} ${foto.nombre || ""}`.toLowerCase();
    return texto.includes("trabajo") || texto.includes("egreso") || texto.includes("final") || texto.includes("cierre");
  };

  const esOtraChecklist = (foto: FotoInformeTecnico) => {
    const texto = `${foto.etapa || ""} ${foto.nombre || ""} ${foto.itemLabel || ""}`.toLowerCase();
    return texto.includes("otra") || texto.includes("general checklist") || texto.includes("otras fotos");
  };

  return {
    ingreso: todas.filter(esIngreso),
    trabajo: todas.filter(esTrabajo),
    otrasChecklist: todas.filter(esOtraChecklist),
    checklist: todas.filter((foto) => !esIngreso(foto) && !esTrabajo(foto) && !esOtraChecklist(foto)),
  };
}

function fotosHTML(titulo: string, fotos?: FotoInformeTecnico[] | string[]) {
  const fotosNormalizadas = normalizarFotos(fotos);
  if (!fotosNormalizadas.length) return "";

  return `
    <section class="section">
      <h2>${escapar(titulo)}</h2>
      <div class="photos">
        ${fotosNormalizadas
          .map((foto) => {
            const nombre = foto.nombre || "Foto";
            const subtitulo = foto.itemLabel || foto.etapa || foto.observacion || "";

            return `
              <a class="photo" href="${escapar(foto.url)}" target="_blank" rel="noopener noreferrer" title="Abrir imagen completa">
                <img src="${escapar(foto.url)}" alt="${escapar(nombre)}" />
                <span>${escapar(nombre)}</span>
                ${subtitulo ? `<small>${escapar(subtitulo)}</small>` : ""}
              </a>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function documentosHTML(titulo: string, documentos?: DocumentoInformeTecnico[]) {
  if (!documentos?.length) return "";

  return `
    <section class="section">
      <h2>${escapar(titulo)}</h2>
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
                  <td>${
                    doc.url
                      ? `<a href="${escapar(doc.url)}" target="_blank" rel="noopener noreferrer">Abrir</a>`
                      : "No disponible"
                  }</td>
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
    <div class="equipmentGrid">
      <div class="info"><span>Tipo</span><strong>${escapar(equipo.equipo || equipo.titulo || "-")}</strong></div>
      <div class="info"><span>Marca</span><strong>${escapar(equipo.marca || "-")}</strong></div>
      <div class="info"><span>Modelo</span><strong>${escapar(equipo.modelo || "-")}</strong></div>
      <div class="info"><span>Serie</span><strong>${escapar(equipo.numeroSerie || "-")}</strong></div>
      <div class="info"><span>Código</span><strong>${escapar(equipo.codigo || "-")}</strong></div>
      <div class="info"><span>Capacidad</span><strong>${escapar(equipo.capacidad || "-")}</strong></div>
      <div class="info full"><span>Accesorios</span><strong>${escapar(equipo.accesorios || "-")}</strong></div>
    </div>
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
  const fotosSeparadas = separarFotosPorEtapa(equipo.fotos);

  const fotosIngreso = [
    ...normalizarFotos(equipo.fotosIngreso, "Ingreso"),
    ...fotosSeparadas.ingreso,
  ];

  const fotosChecklist = [
    ...normalizarFotos(equipo.fotosChecklist, "Checklist / diagnóstico"),
    ...fotosSeparadas.checklist,
  ];

  const otrasFotosChecklist = [
    ...normalizarFotos(equipo.otrasFotosChecklist, "Otras fotos del checklist"),
    ...fotosSeparadas.otrasChecklist,
  ];

  const fotosTrabajo = [
    ...normalizarFotos(equipo.fotosTrabajo, "Trabajo / egreso"),
    ...fotosSeparadas.trabajo,
  ];

  const problema = textoValido(equipo.problemaReportado);
  const observacionesIngreso = textoValido(equipo.observacionesIngreso);

  return `
    <article class="equipment">
      <div class="equipmentHeader">
        <div>
          <span>Equipo ${index + 1}</span>
          <h1>${escapar(equipo.titulo || equipo.equipo || "Equipo")}</h1>
        </div>
      </div>

      <section class="section compact">
        <h2>Datos del equipo</h2>
        ${datosEquipoHTML(equipo)}
      </section>

      ${problema ? bloque("Problema reportado al ingreso", problema) : ""}
      ${observacionesIngreso ? bloque("Observaciones iniciales", observacionesIngreso) : ""}

      ${fotosHTML("Fotos de ingreso", fotosIngreso)}
      ${bloque("Resultado del checklist", equipo.checklist)}
      ${bloque("Diagnóstico técnico", equipo.diagnostico)}
      ${fotosHTML("Fotos del checklist / diagnóstico", fotosChecklist)}
      ${fotosHTML("Otras fotos del checklist", otrasFotosChecklist)}

      ${bloque("Procedimiento recomendado", equipo.procedimiento)}
      ${bloque("Repuestos solicitados", equipo.repuestos)}
      ${bloque("Trabajo realizado / cierre operativo", equipo.trabajoRealizado)}
      ${bloque("Repuestos utilizados", equipo.repuestosUtilizados)}
      ${pruebasHTML(equipo)}
      ${fotosHTML("Fotos de trabajo / egreso", fotosTrabajo)}
      ${bloque("Observaciones finales", equipo.observaciones)}
      ${documentosHTML("Documentos / certificados del equipo", [
        ...(equipo.documentos || []),
        ...(equipo.documentosTrabajo || []),
      ])}
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
        problemaReportado: data.problemaReportado,
        observacionesIngreso: data.observacionesIngreso,
        procedimiento: data.procedimiento,
        repuestos: data.repuestos,
        observaciones: data.comentario,
        fotos: data.fotos,
        fotosIngreso: data.fotosIngreso,
        fotosChecklist: data.fotosChecklist,
        otrasFotosChecklist: data.otrasFotosChecklist,
        fotosTrabajo: data.fotosTrabajo,
        documentos: data.documentos,
        documentosTrabajo: data.documentosTrabajo,
      },
    ],
  };
}

export function descargarInformeTecnico(dataOriginal: InformeTecnicoData) {
  const data = normalizarData(dataOriginal);
  const fechaEmision = data.fechaEmision || new Date().toLocaleDateString("es-CL");
  const origen = typeof window !== "undefined" ? window.location.origin : "";
  const logoUrl = `${origen}/logo-informe.png`;

  const fotosGlobalesSeparadas = separarFotosPorEtapa(data.fotos);
  const fotosIngresoGlobal = [
    ...normalizarFotos(data.fotosIngreso, "Ingreso"),
    ...fotosGlobalesSeparadas.ingreso,
  ];
  const fotosChecklistGlobal = [
    ...normalizarFotos(data.fotosChecklist, "Checklist / diagnóstico"),
    ...fotosGlobalesSeparadas.checklist,
  ];
  const otrasFotosChecklistGlobal = [
    ...normalizarFotos(data.otrasFotosChecklist, "Otras fotos del checklist"),
    ...fotosGlobalesSeparadas.otrasChecklist,
  ];
  const fotosTrabajoGlobal = [
    ...normalizarFotos(data.fotosTrabajo, "Trabajo / egreso"),
    ...fotosGlobalesSeparadas.trabajo,
  ];

  const problemaGlobal = textoValido(data.problemaReportado);
  const observacionesIngresoGlobal = textoValido(data.observacionesIngreso);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Informe Técnico MJ Industrial</title>
  <style>
    body {
      margin: 0;
      background: #e5e7eb;
      color: #0f172a;
      font-family: Arial, sans-serif;
      line-height: 1.35;
    }

    .printButton {
      position: sticky;
      top: 0;
      z-index: 20;
      width: 100%;
      border: 0;
      background: #2563eb;
      color: white;
      padding: 12px 20px;
      font-weight: 900;
      cursor: pointer;
    }

    .page {
      width: 794px;
      max-width: 794px;
      margin: 22px auto;
      background: white;
      padding: 34px;
      min-height: 1123px;
      box-sizing: border-box;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.14);
    }

    .cover {
      border-bottom: 3px solid #1e3a8a;
      padding-bottom: 14px;
      margin-bottom: 18px;
    }

    .top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 12px;
    }

    .logoWrap img {
      display: block;
      max-width: 170px;
      max-height: 58px;
      object-fit: contain;
    }

    .logoFallback {
      font-size: 20px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: .5px;
    }

    .otBox {
      text-align: right;
      font-size: 11px;
      color: #334155;
    }

    .otBox strong {
      display: block;
      color: #0f172a;
      font-size: 17px;
      margin-bottom: 3px;
    }

    .statusPill {
      display: inline-block;
      background: #fee2e2;
      color: #991b1b;
      border-radius: 999px;
      padding: 4px 9px;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      margin-top: 5px;
    }

    .cover h1 {
      margin: 0;
      color: #1e3a8a;
      font-size: 24px;
      letter-spacing: .08em;
      text-transform: uppercase;
    }

    .coverGrid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 14px;
    }

    .equipmentGrid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }

    .equipmentGrid .full {
      grid-column: span 3;
    }

    .info {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px;
      min-height: 34px;
    }

    .info span {
      display: block;
      color: #64748b;
      text-transform: uppercase;
      font-size: 8px;
      font-weight: 900;
      margin-bottom: 3px;
      letter-spacing: .04em;
    }

    .info strong {
      color: #0f172a;
      font-size: 11px;
    }

    .section {
      margin: 14px 0;
      page-break-inside: avoid;
    }

    .section.compact {
      margin-top: 8px;
    }

    .section h2 {
      color: #1e3a8a;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 5px;
      margin: 0 0 8px;
      font-size: 13px;
      text-transform: uppercase;
    }

    .box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 9px;
      white-space: pre-wrap;
      font-size: 11px;
    }

    .equipment {
      border: 1px solid #dbeafe;
      border-radius: 14px;
      padding: 14px;
      margin: 18px 0;
      page-break-inside: avoid;
    }

    .equipmentHeader {
      background: #eff6ff;
      border-radius: 10px;
      padding: 10px;
      margin-bottom: 10px;
    }

    .equipmentHeader span {
      display: block;
      color: #2563eb;
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
      margin-bottom: 3px;
    }

    .equipmentHeader h1 {
      margin: 0;
      color: #1e3a8a;
      font-size: 18px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-top: 6px;
    }

    th {
      background: #eff6ff;
      color: #1e3a8a;
      text-align: left;
      padding: 7px;
      font-size: 10px;
    }

    td {
      border-top: 1px solid #e2e8f0;
      padding: 7px;
      vertical-align: top;
    }

    a {
      color: #2563eb;
      font-weight: 800;
      text-decoration: none;
    }

    .photos {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
    }

    .photo {
      display: block;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      background: white;
      page-break-inside: avoid;
    }

    .photo img {
      width: 100%;
      height: 76px;
      object-fit: cover;
      display: block;
      background: #f8fafc;
    }

    .photo span,
    .photo small {
      display: block;
      padding: 5px;
      color: #334155;
      font-size: 8px;
      line-height: 1.2;
      word-break: break-word;
    }

    .photo small {
      padding-top: 0;
      color: #64748b;
    }

    .signature {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 42px;
      margin-top: 46px;
    }

    .signature div {
      border-top: 1px solid #0f172a;
      padding-top: 8px;
      text-align: center;
      font-size: 11px;
      font-weight: 800;
    }

    .footer {
      border-top: 1px solid #e2e8f0;
      margin-top: 28px;
      padding-top: 12px;
      text-align: center;
      color: #64748b;
      font-size: 9px;
    }

    @media print {
      .printButton { display: none; }

      body {
        background: white;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .page {
        width: auto;
        max-width: none;
        margin: 0;
        padding: 20px;
        min-height: auto;
        box-shadow: none;
      }

      a {
        color: #1e3a8a;
      }

      .photos {
        grid-template-columns: repeat(5, 1fr);
      }

      .photo img {
        height: 70px;
      }
    }
  </style>
</head>
<body>
  <button class="printButton" onclick="window.print()">Imprimir / Guardar PDF</button>

  <main class="page">
    <section class="cover">
      <div class="top">
        <div class="logoWrap">
          <img src="${escapar(logoUrl)}" alt="MJ Industrial" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
          <div class="logoFallback" style="display:none;">MJ INDUSTRIAL</div>
        </div>

        <div class="otBox">
          <strong>${textoCaja(data.ot)}</strong>
          <div>Estado: ${textoCaja(data.estado)}</div>
          <div>Fecha ingreso: ${textoCaja(data.fechaIngreso)}</div>
          <div>Fecha emisión: ${textoCaja(fechaEmision)}</div>
          <span class="statusPill">${textoCaja(data.estado)}</span>
        </div>
      </div>

      <h1>Informe Técnico</h1>

      <div class="coverGrid">
        <div class="info"><span>Cliente</span><strong>${textoCaja(data.cliente)}</strong></div>
        <div class="info"><span>Empresa</span><strong>${textoCaja(data.empresa || data.cliente)}</strong></div>
        <div class="info"><span>Contacto</span><strong>${textoCaja(data.contacto)}</strong></div>
        <div class="info"><span>Técnico responsable</span><strong>${textoCaja(data.tecnicoResponsable)}</strong></div>
      </div>
    </section>

    ${problemaGlobal ? bloque("Problema reportado al ingreso", problemaGlobal) : ""}
    ${observacionesIngresoGlobal ? bloque("Observaciones iniciales", observacionesIngresoGlobal) : ""}
    ${fotosHTML("Fotos de ingreso", fotosIngresoGlobal)}

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

    ${fotosHTML("Fotos generales del checklist / diagnóstico", fotosChecklistGlobal)}
    ${fotosHTML("Otras fotos generales del checklist", otrasFotosChecklistGlobal)}
    ${fotosHTML("Fotos generales de trabajo / egreso", fotosTrabajoGlobal)}

    ${(data.equipos || []).map((equipo, index) => equipoHTML(equipo, index)).join("")}

    ${documentosHTML("Documentos generales asociados", [
      ...(data.documentos || []),
      ...(data.documentosTrabajo || []),
    ])}

    ${bloque("Observaciones generales", data.observacionesGenerales)}

    <section class="signature">
      <div>Servicio Técnico MJ Industrial</div>
      <div>Cliente / Responsable</div>
    </section>

    <div class="footer">MJ Industrial · www.mjindustrial.cl · Informe técnico generado digitalmente.</div>
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
