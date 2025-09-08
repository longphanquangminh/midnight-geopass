
"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import defaultEvent from "@/config/event";

// Dynamically import the Map component with SSR disabled
const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] bg-slate-100 animate-pulse rounded-lg flex items-center justify-center">
      <p className="text-slate-400">Loading map...</p>
    </div>
  ),
});

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8 items-center">
          {/* Hero Section */}
          <div className="flex-1 space-y-6">
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-primary-700 to-blue-600 bg-clip-text text-transparent">
                GeoPass
              </h1>
              <p className="text-xl sm:text-2xl font-semibold text-slate-700">
                Privacy-First Location Verification
              </p>
            </div>

            <p className="text-slate-600 text-lg max-w-xl">
              Prove your presence in a location without revealing your exact coordinates.
              Powered by zero-knowledge proofs on the Midnight Network.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <Link
                href="/claim"
                className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                Claim Your GeoPass
              </Link>
              <a
                href="https://github.com/yourusername/geopass"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-800 font-medium rounded-lg border border-slate-200 transition-colors"
              >
                View on GitHub
              </a>
            </div>

            <div className="pt-6">
              <div className="inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-100 rounded-full text-sm text-blue-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                Powered by zero-knowledge proofs
              </div>
            </div>
          </div>

          {/* Map Preview */}
          <div className="flex-1 w-full">
            <div className="bg-white p-3 rounded-xl shadow-lg">
              <h3 className="text-lg font-medium text-slate-700 mb-3">Location Demo</h3>
              <div className="h-[400px] rounded-lg overflow-hidden">
                <Map
                  center={defaultEvent.center}
                  zoom={6}
                  geofence={defaultEvent.geofence}
                />
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Example geofence region in Ho&nbsp;Chi&nbsp;Minh&nbsp;City
              </p>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Privacy Preserved</h3>
            <p className="text-slate-600">Your exact location stays on your device. Only a zero-knowledge proof is shared.</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Verifiable Presence</h3>
            <p className="text-slate-600">Cryptographically prove you are in a region without revealing your exact coordinates.</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Decentralized</h3>
            <p className="text-slate-600">Built on Midnight Network blockchain for transparency and censorship resistance.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
