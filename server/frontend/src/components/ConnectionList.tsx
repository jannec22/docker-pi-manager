import { trpc } from "@/utils/trpc";
import { useState } from "react";
import ConnectionListItem from "./ConnectionListItem";

export default function ConnectionList() {
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const { data, isLoading } = trpc.admin.device.listTunnels.useQuery({
    page,
    pageSize,
  });

  if (isLoading) return <p>Loading...</p>;
  if (!data) return <p>No data</p>;

  const { items, totalPages } = data;

  return (
    <div className="mt-4 grow flex flex-col">
      <strong className="text-xl">Connections:</strong>

      <ul className="grow">
        {items.map(connection => (
          <ConnectionListItem key={connection.deviceId} connection={connection} />
        ))}
      </ul>
      <div style={{ marginTop: "1rem" }}>
        <button
          type="button"
          onClick={() => setPage(p => Math.max(p - 1, 0))}
          disabled={page === 0}
        >
          Previous
        </button>
        <span style={{ margin: "0 1rem" }}>
          Page {page + 1} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => setPage(p => Math.min(p + 1, totalPages - 1))}
          disabled={page >= totalPages - 1}
        >
          Next
        </button>
      </div>
    </div>
  );
}
