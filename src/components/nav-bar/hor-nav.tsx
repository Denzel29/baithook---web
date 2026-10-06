"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { UserType } from "@/types/shared";

type HorizontalNavProps = {
  activeProfile: UserType;
  onProfileChange: (profile: UserType) => void;
};

export const HorizontalNav = ({
  activeProfile,
  onProfileChange,
}: HorizontalNavProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="mx-auto w-full max-w-7xl px-4 py-1 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Image
                src="/logo3.png"
                alt="Baitline Logo"
                width={150}
                height={100}
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden items-center space-x-6 sm:flex">
            <button
              onClick={() => onProfileChange(UserType.Individual)}
              className={`cursor-pointer rounded-[6px] px-4 py-2 font-medium transition-all duration-200 ${
                activeProfile === UserType.Individual
                  ? "bg-[#435d89] text-white hover:bg-[#435d89]/90"
                  : "border border-gray-200 bg-gray-100 text-gray-700 hover:border-gray-300 hover:bg-gray-200 hover:text-gray-900"
              }`}
            >
              Login
            </button>

            <button
              onClick={() => onProfileChange(UserType.Organization)}
              className={`cursor-pointer rounded-xl px-4 py-2 font-medium transition-all duration-200 ${
                activeProfile === UserType.Organization
                  ? "bg-[#435d89] text-white hover:bg-[#435d89]/90"
                  : "border border-gray-200 bg-gray-100 text-gray-700 hover:border-gray-300 hover:bg-gray-200 hover:text-gray-900"
              }`}
            >
              Organizations
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="sm:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="cursor-pointer rounded-md p-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="border-t border-gray-100 sm:hidden">
            <div className="space-y-3 py-4">
              <button
                onClick={() => {
                  onProfileChange(UserType.Individual);
                  setIsMenuOpen(false);
                }}
                className={`block w-full cursor-pointer rounded-xl px-6 py-3 text-center font-medium transition-all duration-200 ${
                  activeProfile === UserType.Individual
                    ? "bg-[#435d89] text-white"
                    : "border border-gray-200 bg-gray-100 text-gray-700 hover:border-gray-300 hover:bg-gray-200 hover:text-gray-900"
                }`}
              >
                Login
              </button>
              <button
                onClick={() => {
                  onProfileChange(UserType.Organization);
                  setIsMenuOpen(false);
                }}
                className={`block w-full cursor-pointer rounded-lg px-6 py-2 text-center font-medium transition-colors duration-200 ${
                  activeProfile === UserType.Organization
                    ? "bg-[#435d89] text-white"
                    : "border border-gray-200 bg-gray-100 text-gray-700 hover:border-gray-300 hover:bg-gray-200 hover:text-gray-900"
                }`}
              >
                Organizations
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
