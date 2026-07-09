export default function EmptyState({ message = 'Nema stavki' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">🛒</div>
      <p className="text-gray-400 text-lg font-medium">{message}</p>
      <p className="text-gray-300 text-sm mt-1">Dodaj prvu stavku gore</p>
    </div>
  );
}
