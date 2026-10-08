// ข้อความแจ้งสถานะโหลด/ผิดพลาด ใช้บนหัวหน้าฝั่งอาจารย์
export default function LoadState({ loading, error, onRetry }) {
  if (error) {
    return (
      <div className="flex items-center justify-between gap-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 text-red-600 dark:text-red-400 text-sm rounded-xl px-4 py-3">
        <span>{error}</span>
        {onRetry && (
          <button onClick={onRetry} className="font-semibold hover:underline shrink-0">
            ลองใหม่
          </button>
        )}
      </div>
    );
  }
  if (loading) {
    return <div className="text-sm text-slate-400 dark:text-slate-500">กำลังโหลดข้อมูล...</div>;
  }
  return null;
}
