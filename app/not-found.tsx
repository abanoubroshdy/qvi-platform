import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
      <p className="text-sm font-bold text-primary">404</p>
      <h1 className="mt-2 text-3xl font-semibold">Page not found</h1>
      <p className="mt-3 text-sm leading-8 text-muted-foreground">
        That link is missing or moved. Head back to QVI products or the free tools.
      </p>
      <Button asChild className="mt-6" size="lg">
        <Link href="/">Back to QVI</Link>
      </Button>
    </div>
  );
}
