export function ErrorState({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: 24,
        color: "#b91c1c",
        background: "#fef2f2",
        borderRadius: 8,
      }}
    >
      {message}
    </div>
  );
}
