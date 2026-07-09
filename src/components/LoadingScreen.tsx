export default function LoadingScreen({ message = 'Učitavanje...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}
