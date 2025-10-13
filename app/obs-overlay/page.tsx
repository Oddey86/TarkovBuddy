'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, ExternalLink, Check } from 'lucide-react';

export default function OBSOverlayPage() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const overlayUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/obs-overlay.html`
    : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(overlayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0e0f13]">
      <header className="sticky top-0 z-20 bg-[#0e0f13]/95 backdrop-blur-md border-b border-[#24283b]">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold tracking-wide">OBS Overlay Setup</h1>
            <div className="flex-1" />
            <Button
              onClick={() => router.push('/quest')}
              variant="outline"
              className="border-[#24283b] hover:bg-[#2a2e45] text-sm"
            >
              Back to Quest Tracker
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <Card className="bg-[#1a1d2e] border-[#24283b] p-6">
          <h2 className="text-xl font-bold mb-4">Copy Overlay URL</h2>
          <p className="text-sm text-[#8a8fa5] mb-4">
            Copy this URL and paste it into OBS as a Browser Source
          </p>

          <div className="flex gap-2 mb-6">
            <Input
              value={overlayUrl}
              readOnly
              className="bg-[#0e0f13] border-[#24283b] text-[#e8eaf6] font-mono text-sm"
            />
            <Button
              onClick={copyToClipboard}
              className="bg-[#6b73ff] hover:bg-[#5a63ee] gap-2 flex-shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy URL
                </>
              )}
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">How to add to OBS:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-[#a8afc7] ml-2">
                <li>Open OBS Studio</li>
                <li>Click the + button in the Sources panel</li>
                <li>Select &quot;Browser&quot; from the list</li>
                <li>Name it &quot;Tarkov Progress&quot; (or whatever you like)</li>
                <li>Paste the URL above into the &quot;URL&quot; field</li>
                <li>Set Width: 500 and Height: 300 (or adjust to your preference)</li>
                <li>Check &quot;Shutdown source when not visible&quot; for better performance</li>
                <li>Click OK</li>
              </ol>
            </div>

            <div className="bg-[#0e0f13] border border-[#24283b] rounded-lg p-4">
              <h3 className="font-semibold text-sm mb-2 text-[#6b73ff]">Optional: Compact Mode</h3>
              <p className="text-xs text-[#8a8fa5] mb-2">
                For a smaller overlay, add <code className="bg-[#1a1d2e] px-1 py-0.5 rounded">?compact=true</code> to the end of the URL:
              </p>
              <code className="text-xs bg-[#1a1d2e] px-2 py-1 rounded block overflow-x-auto text-[#a8afc7]">
                {overlayUrl}?compact=true
              </code>
            </div>
          </div>
        </Card>

        <Card className="bg-[#1a1d2e] border-[#24283b] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Live Preview</h2>
            <Button
              onClick={() => window.open('/obs-overlay.html', '_blank')}
              variant="outline"
              className="border-[#24283b] hover:bg-[#2a2e45] text-sm gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open in New Tab
            </Button>
          </div>

          <p className="text-sm text-[#8a8fa5] mb-4">
            This is how your overlay will look in OBS (transparent background in OBS)
          </p>

          <div className="bg-[#0e0f13] rounded-lg p-4 border border-[#24283b]">
            <iframe
              src="/obs-overlay.html"
              className="w-full h-[300px] rounded border-0"
              title="OBS Overlay Preview"
            />
          </div>
        </Card>

        <Card className="bg-[#1a1d2e] border-[#24283b] p-6">
          <h2 className="text-xl font-bold mb-4">Tips & Tricks</h2>
          <ul className="space-y-2 text-sm text-[#a8afc7]">
            <li className="flex items-start gap-2">
              <span className="text-[#6b73ff] font-bold">•</span>
              <span>The overlay updates automatically every 2 seconds as you complete quests</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#6b73ff] font-bold">•</span>
              <span>Position and resize the overlay anywhere on your stream</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#6b73ff] font-bold">•</span>
              <span>The background is transparent in OBS, only the stats box will show</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#6b73ff] font-bold">•</span>
              <span>Make sure you complete quests in the Quest Tracker for the overlay to update</span>
            </li>
          </ul>
        </Card>
      </main>
    </div>
  );
}
