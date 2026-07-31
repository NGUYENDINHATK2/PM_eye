export function NoAccess({ message }: { message?: string }) {
  return (
    <div className="mx-auto max-w-md py-20 text-center animate-fade-up">
      <div className="text-base font-semibold">Không có quyền truy cập</div>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        {message ??
          "Tài khoản của bạn không được xem nội dung này. Liên hệ admin nếu cần cấp quyền."}
      </p>
    </div>
  );
}
