import Link from "next/link";
import Image from "next/image";

export function SiteFooter() {
  return (
    <footer className="w-full border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:grid-cols-4">
          {/* Brand section */}
          <div className="flex flex-col gap-4 md:col-span-1 lg:col-span-2">
            <Link href="/" className="flex items-center space-x-2">
              <Image
                src="/logo3.png"
                alt="PhishGuard Logo"
                width={120}
                height={40}
                className="h-10 w-auto"
              />
            </Link>
            <p className="max-w-xs text-sm text-gray-500">
              Interactive phishing simulation and security awareness training. Empower your team to spot the hook before it's too late.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-gray-900">Platform</h3>
            <Link href="/login" className="text-sm text-gray-600 hover:text-[#435d89]">
              Login
            </Link>
            <Link href="/register-organization" className="text-sm text-gray-600 hover:text-[#2016a9]">
              For Organizations
            </Link>
            <Link href="/sandbox" className="text-sm text-gray-600 hover:text-green-600">
              Interactive Sandbox
            </Link>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-gray-900">Legal</h3>
            <Link href="#" className="text-sm text-gray-600 hover:text-[#435d89]">
              Privacy Policy
            </Link>
            <Link href="#" className="text-sm text-gray-600 hover:text-[#435d89]">
              Terms of Service
            </Link>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between border-t border-gray-200 pt-8 sm:flex-row">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} PhishGuard. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
