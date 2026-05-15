import Link from "next/link";

export default function NotFound() {
  return (
    <div className="text-center py-24">
      <h2 className="text-xl font-semibold">Không tìm thấy dự án</h2>
      <Link
        href="/projects"
        className="mt-3 inline-block text-sm text-indigo-600 hover:underline"
      >
        ← Quay về danh sách dự án
      </Link>
    </div>
  );
}
