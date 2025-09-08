"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import defaultEvent, { isInside } from "@/config/event";
import {
  connect as connectWallet,
  isInstalled,
  autoReconnect,
  type WalletInfo,
  signMessage,
} from "@/lib/wallet";
import ngeohash from "ngeohash";

// Dynamically import the Map component with SSR disabled
const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] bg-slate-100 animate-pulse rounded-lg flex items-center justify-center">
      <p className="text-slate-400">Loading map...</p>
    </div>
  ),
});

// Single default event (Ho Chi Minh City demo)
const SAMPLE_EVENTS = [defaultEvent];

export default function ClaimPage() {
  const [step, setStep] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState(SAMPLE_EVENTS[0]);
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    geohash: string;
    isEligible: boolean;
  } | null>(null);
  const [proof, setProof] = useState<{
    nullifier: string;
    zkProof: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Wallet connection state
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  // Allow bypassing wallet for demo purposes
  const [demoSkipWallet, setDemoSkipWallet] = useState(false);
  // Signature from message signing
  const [signature, setSignature] = useState<string | null>(null);

  // Try auto-reconnect on mount
  useEffect(() => {
    autoReconnect()
      .then((w) => {
        if (w) setWallet(w);
      })
      .catch(() => {
        /* silent */
      });
  }, []);

  // Function to request user's geolocation
  const requestLocation = () => {
    setIsLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Compute geohash (precision 6)
        const geohash = ngeohash.encode(latitude, longitude, 6);

        // Check eligibility using bounding-box
        const isEligible = isInside(
          latitude,
          longitude,
          defaultEvent.bbox
        );

        setLocation({
          latitude,
          longitude,
          geohash,
          isEligible,
        });

        setIsLoading(false);

        // Move to next step
        if (isEligible) {
          setStep(4);
        }
      },
      (error) => {
        setError(`Error getting location: ${error.message}`);
        setIsLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  // Function to generate mock proof and nullifier
  const generateProof = async () => {
    setIsLoading(true);

    try {
      // Create a device secret (in a real app, this would be stored securely)
      const deviceSecret = crypto.randomUUID();

      // Combine device secret with event ID
      const data = `${deviceSecret}:${selectedEvent.id}`;

      // Convert to buffer
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);

      // Generate SHA-256 hash for nullifier using Web Crypto API
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const nullifier = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // In a real implementation, we would generate a ZK proof here
      // For now, we'll just mock it with a random string
      const mockZkProof = Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');

      setProof({
        nullifier,
        zkProof: mockZkProof,
      });

      setStep(5);
    } catch (error) {
      setError(`Error generating proof: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle form submission (disabled for now)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Guard: nothing to submit without proof
    if (!proof || !location) {
      alert("Missing proof or location data.");
      return;
    }

    // Demo path – no wallet required
    if (demoSkipWallet) {
      alert("✅ Demo submit succeeded (no blockchain interaction).");
      return;
    }

    // Require wallet connection
    if (!wallet) {
      alert("Please connect your wallet first.");
      return;
    }

    // Build submission payload
    const payload = {
      eventId: selectedEvent.id,
      coords: {
        lat: location.latitude,
        lon: location.longitude,
      },
      geohash: location.geohash,
      nullifier: proof.nullifier,
      timestamp: Date.now(),
    };

    const run = async () => {
      setIsLoading(true);
      try {
        const sig = await signMessage(JSON.stringify(payload));
        if (sig) {
          alert("✅ Signed & ready – payload would now be sent on-chain.\nSignature: " + sig);
        } else {
          alert("❌ Wallet did not return a signature.");
        }
      } catch (err: unknown) {
        console.error("Submit error:", err);
        const msg = err instanceof Error ? err.message : String(err);
        alert(`❌ Submission failed: ${msg}`);
      } finally {
        setIsLoading(false);
      }
    };

    run();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/" className="text-primary-600 hover:text-primary-700 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Home
          </Link>
        </div>

        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-800 mb-6">Claim Your GeoPass</h1>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Progress Steps */}
            <div className="px-6 pt-6">
              <div className="flex items-center justify-between mb-8">
                {[1, 2, 3, 4, 5, 6].map((stepNumber) => (
                  <div key={stepNumber} className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        step >= stepNumber
                          ? 'bg-primary-600 text-white'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {stepNumber}
                    </div>
                    <div className={`text-xs mt-2 ${
                      step >= stepNumber ? 'text-slate-700' : 'text-slate-400'
                    }`}>
                      Step {stepNumber}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="px-6 pb-6">
              {/* Step 1: Select Event */}
              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-slate-800">Select an Event</h2>
                  <p className="text-slate-600">Choose the event you want to claim a GeoPass for.</p>

                  <div className="mt-4">
                    <label htmlFor="event" className="block text-sm font-medium text-slate-700 mb-1">
                      Event
                    </label>
                    <select
                      id="event"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                      value={selectedEvent.id}
                      onChange={(e) => {
                        const event = SAMPLE_EVENTS.find(event => event.id === e.target.value);
                        if (event) setSelectedEvent(event);
                      }}
                    >
                      {SAMPLE_EVENTS.map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-6">
                    <button
                      type="button"
                      className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
                      onClick={() => setStep(2)}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: View Event Location */}
              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-slate-800">Event Location</h2>
                  <p className="text-slate-600">
                    This is the geofenced area for {selectedEvent.name}. You must be within this area to claim your GeoPass.
                  </p>

                  <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden">
                    <div className="h-[300px]">
                      <Map
                        center={selectedEvent.center}
                        zoom={6}
                        geofence={selectedEvent.geofence}
                      />
                    </div>
                    <div className="bg-slate-50 px-4 py-2 text-sm text-slate-600">
                      Location: {selectedEvent.location}
                    </div>
                  </div>

                  <div className="mt-6 flex space-x-3">
                    <button
                      type="button"
                      className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                      onClick={() => setStep(1)}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
                      onClick={() => setStep(3)}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Get User Location */}
              {step === 3 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-slate-800">Check Your Location</h2>
                  <p className="text-slate-600">
                    We need to check if you are within the event area. Your exact location will stay on your device.
                  </p>

                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">Privacy Notice</h3>
                        <div className="mt-1 text-sm text-blue-700">
                          <p>Your exact coordinates never leave your device. We only check if you are in the event area.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {location && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                      <h3 className="text-sm font-medium text-slate-700 mb-2">Your Location</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-slate-500">Latitude:</span>
                          <span className="ml-2 font-mono">{location.latitude.toFixed(6)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Longitude:</span>
                          <span className="ml-2 font-mono">{location.longitude.toFixed(6)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Geohash:</span>
                          <span className="ml-2 font-mono">{location.geohash}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Eligible:</span>
                          <span className={`ml-2 ${location.isEligible ? 'text-green-600' : 'text-red-600'}`}>
                            {location.isEligible ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100">
                      {error}
                    </div>
                  )}

                  <div className="mt-6 flex space-x-3">
                    <button
                      type="button"
                      className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                      onClick={() => setStep(2)}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
                      onClick={requestLocation}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          Use My Location
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Check Eligibility */}
              {step === 4 && location && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-slate-800">Location Verified</h2>

                  <div className={`p-4 rounded-lg ${location.isEligible ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        {location.isEligible ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="ml-3">
                        <h3 className={`text-sm font-medium ${location.isEligible ? 'text-green-800' : 'text-red-800'}`}>
                          {location.isEligible ? 'You are in the event area!' : 'You are not in the event area'}
                        </h3>
                        <div className={`mt-1 text-sm ${location.isEligible ? 'text-green-700' : 'text-red-700'}`}>
                          {location.isEligible ? (
                            <p>Your location has been verified. You can now generate your proof.</p>
                          ) : (
                            <p>You must be within the event area to claim your GeoPass. Please try again when you are at the event.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex space-x-3">
                    <button
                      type="button"
                      className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                      onClick={() => setStep(3)}
                    >
                      Back
                    </button>
                    {location.isEligible && (
                      <button
                        type="button"
                        className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
                        onClick={generateProof}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generating Proof...
                          </span>
                        ) : (
                          "Generate ZK Proof"
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Step 5: Generate Proof */}
              {step === 5 && proof && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-slate-800">Proof Generated</h2>
                  <p className="text-slate-600">
                    Your zero-knowledge proof has been generated. This proves you are in the event area without revealing your exact location.
                  </p>

                  <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                    <h3 className="text-sm font-medium text-slate-700 mb-2">Proof Details</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-slate-500">Nullifier:</span>
                        <div className="mt-1 font-mono text-xs bg-white p-2 rounded border border-slate-200 overflow-x-auto">
                          {proof.nullifier}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500">ZK Proof (mock):</span>
                        <div className="mt-1 font-mono text-xs bg-white p-2 rounded border border-slate-200 overflow-x-auto">
                          {proof.zkProof}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex space-x-3">
                    <button
                      type="button"
                      className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                      onClick={() => setStep(4)}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
                      onClick={() => setStep(6)}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* Step 6: Submit */}
              {step === 6 && proof && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-slate-800">Submit Your Proof</h2>
                  <p className="text-slate-600">
                    In a real implementation, this would submit your proof to the Midnight Network blockchain.
                  </p>
                  {/* Wallet connect section */}
                  <div>
                    {wallet ? (
                      <div className="inline-flex items-center px-3 py-2 bg-green-50 border border-green-100 rounded-md text-sm text-green-700">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-1 text-green-600"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {wallet.name} connected (
                        {wallet.address?.slice(0, 6)}…
                        {wallet.address?.slice(-4)})
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          setWalletError(null);
                          if (!isInstalled()) {
                            setWalletError("No compatible wallet detected.");
                            return;
                          }
                          const w = await connectWallet();
                          if (w) setWallet(w);
                          else setWalletError("Failed to connect wallet.");
                        }}
                        className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 mr-2"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V8.414A2 2 0 0017.414 7L13 2.586A2 2 0 0011.586 2H4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Connect Wallet
                      </button>
                    )}
                    {walletError && (
                      <p className="text-sm text-red-600 mt-2">{walletError}</p>
                    )}
                    {/* Sign message button */}
                    {wallet && (
                      <div className="mt-3 space-x-2">
                        <button
                          type="button"
                          onClick={async () => {
                            if (signature) return;
                            const sig = await signMessage("GeoPass signing test");
                            if (sig) setSignature(sig);
                          }}
                          disabled={!!signature}
                          className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                            signature
                              ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                              : "bg-primary-600 hover:bg-primary-700 text-white"
                          }`}
                        >
                          {signature ? "Message Signed" : "Sign Message"}
                        </button>
                        {signature && (
                          <span className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                            Signed
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Demo skip-wallet option */}
                  <div className="mt-4">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-primary-600 border-slate-300 rounded"
                        checked={demoSkipWallet}
                        onChange={(e) => setDemoSkipWallet(e.target.checked)}
                      />
                      <span className="ml-2 text-sm text-slate-700">
                        Skip wallet (demo)
                      </span>
                    </label>
                    <p className="text-xs text-slate-500 mt-1 ml-6">
                      Use this if your wallet extension won’t open.
                    </p>
                  </div>

                  <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">Demo Mode</h3>
                        <div className="mt-1 text-sm text-yellow-700">
                          <p>This is a demo implementation. In a real app, this would connect to the Midnight Network and submit your proof to the blockchain.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex space-x-3">
                    {/* Back button */}
                    <button
                      type="button"
                      className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                      onClick={() => setStep(5)}
                    >
                      Back
                    </button>
                    {/* Submit button */}
                    <button
                      type="submit"
                      disabled={!wallet && !demoSkipWallet}
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                        wallet || demoSkipWallet
                          ? "bg-primary-600 hover:bg-primary-700 text-white"
                          : "bg-slate-300 text-slate-500 cursor-not-allowed"
                      }`}
                    >
                      {wallet
                        ? "Submit to Blockchain (Coming Soon)"
                        : demoSkipWallet
                        ? "Submit (Demo)"
                        : "Connect Wallet First"}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
