'use client';

export default function ClientFooter() {
  return (
    <footer className="border-t bg-muted py-6 px-4 md:px-8">
      <div className="container mx-auto text-center">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()}{' '}
          <a
            href="https://go.warrantywatcher.com/projectpage"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Warranty Watcher
          </a>
        </p>
      </div>
    </footer>
  );
} 