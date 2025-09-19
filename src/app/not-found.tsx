export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Not Found</h2>
        <p className="text-gray-600 mb-4">Could not find requested resource</p>
        <a href="/" className="text-blue-600 hover:text-blue-800 underline">
          Return Home
        </a>
      </div>
    </div>
  )
}
