type TimelineOTProps = {
  etapas: string[];
  etapaActualIndex: number;
};

export default function TimelineOT({ etapas, etapaActualIndex }: TimelineOTProps) {
  return (
    <section
      style={{
        backgroundColor: "white",
        borderRadius: 18,
        padding: 18,
        border: "1px solid #e2e8f0",
        marginBottom: 18,
        overflowX: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          minWidth: 760,
        }}
      >
        {etapas.map((etapa, index) => {
          const completada = index <= etapaActualIndex;
          const actual = index === etapaActualIndex;

          return (
            <div
              key={etapa}
              style={{
                display: "flex",
                alignItems: "center",
                flex: 1,
              }}
            >
              <div style={{ textAlign: "center", minWidth: 82 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    margin: "0 auto 7px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: actual
                      ? "#2563eb"
                      : completada
                      ? "#dbeafe"
                      : "#e5e7eb",
                    color: actual
                      ? "white"
                      : completada
                      ? "#2563eb"
                      : "#94a3b8",
                    fontWeight: 900,
                    fontSize: 14,
                  }}
                >
                  {index + 1}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    fontWeight: actual ? 900 : 700,
                    color: completada ? "#2563eb" : "#94a3b8",
                  }}
                >
                  {etapa}
                </div>
              </div>

              {index < etapas.length - 1 && (
                <div
                  style={{
                    height: 3,
                    flex: 1,
                    backgroundColor:
                      index < etapaActualIndex ? "#2563eb" : "#e5e7eb",
                    margin: "0 4px 24px",
                    borderRadius: 999,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}