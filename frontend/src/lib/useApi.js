import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

// โหลดข้อมูลจาก backend หนึ่ง endpoint: { data, error, loading, reload }
// path เป็น null = ยังไม่โหลด (เช่น รอเลือกวิชาก่อน)
export function useApi(path, initial = null) {
  const [state, setState] = useState({ data: initial, error: "", loading: !!path });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!path) return undefined;
    let cancelled = false;
    api(path)
      .then((data) => !cancelled && setState({ data, error: "", loading: false }))
      .catch((err) => !cancelled && setState((s) => ({ ...s, error: err.message, loading: false })));
    return () => {
      cancelled = true;
    };
  }, [path, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { ...state, reload };
}
