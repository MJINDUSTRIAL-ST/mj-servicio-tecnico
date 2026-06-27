type Props = {
  fotos: string[];
  onOpen: (url: string) => void;
};

export default function FotosIngreso({ fotos, onOpen }: Props) {
  return (
    <section className="card">
      <h2>Fotos del estado inicial</h2>

      {fotos.length === 0 ? (
        <div className="empty">No hay fotos iniciales registradas.</div>
      ) : (
        <div className="photos">
          {fotos.map((fotoUrl, index) => (
            <img
              key={`${fotoUrl}-${index}`}
              src={fotoUrl}
              alt={`Foto inicial ${index + 1}`}
              onClick={() => onOpen(fotoUrl)}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        .card {
          background: white;
          border-radius: 18px;
          padding: 20px;
          border: 1px solid #e2e8f0;
          margin-bottom: 18px;
        }

        h2 {
          font-size: 18px;
          margin: 0 0 16px;
          color: #0f172a;
        }

        .empty {
          color: #64748b;
          font-size: 14px;
        }

        .photos {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        img {
          width: 118px;
          height: 118px;
          object-fit: cover;
          border-radius: 12px;
          border: 1px solid #dbe4f0;
          cursor: pointer;
          background: white;
        }
      `}</style>
    </section>
  );
}