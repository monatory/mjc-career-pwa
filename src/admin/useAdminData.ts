/**
 * 관리자 대시보드 데이터 로딩 훅
 * ───────────────────────────────
 * Firestore에서 모든 응답을 fetch + 집계. 데이터가 0건이거나 fetch 실패 시
 * mockData.ts의 가상 데이터로 자연 폴백 (시범운영 미리보기 모드).
 *
 * 시범운영 100명 수준에서는 한 번에 전체 fetch가 충분.
 * 본 운영에서는 Cloud Functions로 사전 집계 + onSnapshot 실시간 갱신 권장.
 */

import { useEffect, useState } from "react";
import { fetchAllResponses } from "../lib/firestoreAdmin";
import type { SavedResponse } from "../lib/firestoreClient";

export interface AdminDataState {
  loading: boolean;
  responses: SavedResponse[];
  isLive: boolean;     // true: 실측 데이터(>= 1건) / false: mock 폴백
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAdminData(): AdminDataState {
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<SavedResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchAllResponses();
      setResponses(rows);
    } catch (e) {
      setError(String(e));
      setResponses([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return {
    loading,
    responses,
    isLive: responses.length > 0,
    error,
    refetch: load,
  };
}
