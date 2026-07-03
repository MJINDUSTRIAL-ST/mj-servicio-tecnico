type InformeTecnicoData = {
  equipoTitulo: string;
  equipoDetalle: string;
  procedimiento: string;
  repuestos: string;
  horas: string;
  comentario: string;
};

export function descargarInformeTecnico(data: InformeTecnicoData) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Informe Técnico MJ Industrial</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      color: #0f172a;
      padding: 32px;
      line-height: 1.45;
    }

    .header {
      border-bottom: 3px solid #1e3a8a;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }

    h1 {
      margin: 0;
      color: #1e3a8a;
      font-size: 26px;
    }

    h2 {
      margin-top: 28px;
      color: #1e3a8a;
      font-size: 18px;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 6px;
    }

    .logo {
      font-weight: 900;
      font-size: 22px;
      color: #0f172a;
      margin-bottom: 8px;
    }

    .box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px;
      margin-top: 10px;
      white-space: pre-wrap;
    }

    .footer {
      margin-top: 40px;
      border-top: 1px solid #cbd5e1;
      padding-top: 16px;
      font-size: 12px;
      color: #64748b;
    }

    @media print {
      button {
        display: none;
      }
    }
  </style>
</head>

<body>
  <button onclick="window.print()">Imprimir / Guardar PDF</button>

  <div class="header">
    <div class="logo">MJ INDUSTRIAL</div>
    <h1>Informe Técnico</h1>
    <p>Documento generado desde el sistema de Servicio Técnico MJ Industrial.</p>
  </div>

  <h2>Datos del equipo</h2>
  <div class="box">
${data.equipoTitulo}
${data.equipoDetalle}
  </div>

  <h2>Procedimiento sugerido</h2>
  <div class="box">${data.procedimiento || "Sin procedimiento informado."}</div>

  <h2>Repuestos sugeridos</h2>
  <div class="box">${data.repuestos || "Sin repuestos sugeridos."}</div>

  <h2>Horas hombre estimadas</h2>
  <div class="box">${data.horas || "No informado."}</div>

  <h2>Comentario / motivo</h2>
  <div class="box">${data.comentario || "Sin comentarios adicionales."}</div>

  <h2>Fotografías</h2>
  <div class="box">
Las fotografías asociadas al checklist se incluirán en el informe final y serán clickeables.
  </div>

  <div class="footer">
    MJ Industrial · Informe técnico generado digitalmente.
  </div>
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