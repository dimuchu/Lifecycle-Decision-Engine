"use client";

import { useEffect, useState } from "react";
import type { BrazeSnapshot } from "@/types/braze";
import CanvasTable from "@/components/CanvasTable";
import SegmentHealth from "@/components/SegmentHealth";

export default function Home() {
  const [data, setData] = useState<BrazeSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/braze")
      .then((res) => {
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        return res.json();
      })
      .then((json: BrazeSnapshot) => setData(json))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          CRM Intelligence Copilot
        </h1>
        {data?.fetchedAt && (
          <p className="mt-1 text-sm text-gray-500">
            Last updated: {new Date(data.fetchedAt).toLocaleString()}
          </p>
        )}
      </header>

      {/* TODO: KPI Cards */}
      {/* TODO: Trend Charts */}
      {/* TODO: Campaign Leaderboard */}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load data: {error}
        </div>
      )}

      {data && (
        <div className="space-y-8">
          <CanvasTable data={data.canvases} />
          <SegmentHealth data={data.segments} />
        </div>
      )}
    </main>
  );
}
