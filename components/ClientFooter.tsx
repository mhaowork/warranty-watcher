'use client';

export default function ClientFooter() {
  return (
    <footer className="py-6 px-4 md:px-8 bg-gray-100 border-t">
      <div className="container mx-auto text-center">
        <p className="text-gray-600">
          &copy; {new Date().getFullYear()} Warranty Watcher
        </p>
      </div>
    </footer>
  );
} 