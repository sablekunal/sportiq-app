import React, { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { QRCodeSVG } from 'qrcode.react';
import { Share2, Copy, Check, ExternalLink, Download, MessageSquare, QrCode } from 'lucide-react';
import { soundEffects } from '../../engines/audioEngine';

export const ShareAndQRStudio: React.FC = () => {
  const { activeTournament, setViewMode } = useTournament();
  const [copied, setCopied] = useState(false);

  if (!activeTournament) return null;

  const publicUrl = `${window.location.origin}?t=${activeTournament.slug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);

    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('tournament-qr-code');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${activeTournament.slug}-qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-sport-navy flex items-center gap-2">
            <Share2 className="w-5 h-5 text-sport-orange" />
            Public Sharing & QR Code Studio
          </h3>
          <p className="text-xs text-slate-500">
            Generate spectator links and scannable venue posters (No login required for fans)
          </p>
        </div>

        <button
          onClick={() => setViewMode('public')}
          className="flex items-center gap-1.5 px-4 py-2 bg-sport-orange hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-glow-orange cursor-pointer"
        >
          <ExternalLink className="w-4 h-4" />
          Open Public Portal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* QR Code Poster Preview */}
        <div className="bg-gradient-to-br from-sport-navy via-slate-900 to-sport-midnight text-white p-8 rounded-3xl border border-slate-800 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
          <div className="text-xs font-black uppercase tracking-wider text-sport-orange mb-1">
            Stadium / Arena Scannable QR
          </div>
          <h4 className="text-xl font-black mb-1">{activeTournament.name}</h4>
          <p className="text-xs text-slate-300 mb-6">
            Scan with any phone camera for live bracket & scores
          </p>

          {/* High resolution QR Container */}
          <div className="p-4 bg-white rounded-2xl shadow-2xl mb-6">
            <QRCodeSVG
              id="tournament-qr-code"
              value={publicUrl}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>

          <button
            onClick={handleDownloadQR}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-sport-navy font-bold text-xs shadow-md hover:bg-slate-100 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-sport-orange" />
            Download High-Res QR (PNG)
          </button>
        </div>

        {/* Share Links & WhatsApp Widget */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Spectator Public Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="w-full text-xs font-mono font-semibold px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-700"
              />
              <button
                onClick={handleCopy}
                className="px-4 py-2.5 bg-sport-navy hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-sm"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Instant WhatsApp Share */}
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
            <div className="flex items-center gap-3 mb-2">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              <div>
                <h5 className="text-xs font-bold text-emerald-950">WhatsApp Team & Spectator Broadcast</h5>
                <p className="text-[11px] text-emerald-700">
                  Share live scores directly with captains, teams, and family members.
                </p>
              </div>
            </div>

            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                `🏆 Track live matches, scores, and brackets for "${activeTournament.name}":\n${publicUrl}`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
            >
              Share via WhatsApp →
            </a>
          </div>

          {/* Features info */}
          <div className="space-y-2 text-xs text-slate-600">
            <div className="font-bold text-slate-800">Spectator Experience Highlights:</div>
            <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-500">
              <li>Zero authentication required for spectators and parents</li>
              <li>Real-time score ticker auto-refreshed as scores are entered</li>
              <li>Interactive zoomable brackets and group standings</li>
              <li>Team rosters and match schedule timelines</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
