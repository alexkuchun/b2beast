import Link from "next/link";
import { Trans } from "@lingui/react/macro";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-gray-600">
          <Trans>Oops! Page not found</Trans>
        </p>
        <Link href="/" className="text-blue-500 underline hover:text-blue-700">
          <Trans>Return to Home</Trans>
        </Link>
      </div>
    </div>
  );
}
