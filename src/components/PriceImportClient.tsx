"use client";

import { useState, useCallback, useRef } from "react";
import { createWorker } from "tesseract.js";
import { bulkImportPrices, type PriceImportItem } from "@/app/actions";

// JSON wzor dla LLM i uzytkownika
const PRICE_JSON_TEMPLATE = `[
  {
    "skin": "P2000 | Dispatch",
    "stattrak": false,
    "quality": "Factory New",
    "steamPrice": 2.50,
    "externalPrice": 2.10
  },
  {
    "skin": "M4A4 | Global Offensive",
    "stattrak": true,
    "quality": "Minimal Wear",
    "steamPrice": 1.80
  }
]`;

const LLM_PROMPT_TEMPLATE = `Proszę wyciągnij z tego zrzutu ekranu ceny skinów CS2 i zwróć je jako JSON array.

Wymagany format każdego elementu:
{
  "skin": "Weapon | SkinName",   // np. "P2000 | Dispatch" - angielska nazwa
  "stattrak": false,              // true jeśli widzisz "StatTrak™" przy nazwie
  "quality": "Factory New",       // jeden z: Factory New, Minimal Wear, Field-Tested, Well-Worn, Battle-Scarred
  "steamPrice": 2.50,             // cena jako liczba (bez "$"), tylko liczba
  "externalPrice": 2.10           // opcjonalnie, jeśli widoczna cena zewnętrzna
}

Zwróć TYLKO poprawny JSON array, bez żadnego dodatkowego tekstu.`;

const QUALITY_OPTIONS = ["Factory New", "Minimal Wear", "Field-Tested", "Well-Worn", "Battle-Scarred"];
const CONDITION_MAP: Record<string, string> = {
  "Factory New": "FN",
  "Minimal Wear": "MW",
  "Field-Tested": "FT",
  "Well-Worn": "WW",
  "Battle-Scarred": "BS",
};

type Tab = "json" | "ocr" | "prompt";

interface ParsedItem extends PriceImportItem {
  _error?: string;
}

export default function PriceImportClient({ skinNames }: { skinNames: string[] }) {
  const [activeTab, setActiveTab] = useState<Tab>("json");
  const [jsonText, setJsonText] = useState("");
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [parseError, setParseError] = useState("");
  const [result, setResult] = useState<{ saved: number; errors: string[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<"json" | "prompt" | null>(null);

  // OCR state
  const [ocrImage, setOcrImage] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseJSON = useCallback((text: string) => {
    setParseError("");
    setResult(null);
    try {
      const raw = JSON.parse(text);
      const arr: ParsedItem[] = Array.isArray(raw) ? raw : [raw];
      setParsedItems(arr.map(item => ({
        skin: item.skin ?? "",
        stattrak: item.stattrak ?? false,
        quality: item.quality ?? "Factory New",
        steamPrice: Number(item.steamPrice ?? 0),
        externalPrice: item.externalPrice ? Number(item.externalPrice) : undefined,
      })));
    } catch {
      setParseError("Niepoprawny JSON — sprawdź format.");
      setParsedItems([]);
    }
  }, []);

  const runOCR = useCallback(async (imageData: string) => {
    setOcrRunning(true);
    setOcrProgress(0);
    setOcrText("");
    try {
      const worker = await createWorker("eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") setOcrProgress(Math.round(m.progress * 100));
        }
      });
      const { data: { text } } = await worker.recognize(imageData);
      await worker.terminate();
      setOcrText(text);
    } catch (e) {
      setOcrText("Błąd OCR: " + String(e));
    } finally {
      setOcrRunning(false);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result as string;
      setOcrImage(data);
      runOCR(data);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result as string;
      setOcrImage(data);
      runOCR(data);
    };
    reader.readAsDataURL(file);
  }, [runOCR]);

  const copyToClipboard = (text: string, key: "json" | "prompt") => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSave = async () => {
    if (parsedItems.length === 0) return;
    setSaving(true);
    setResult(null);
    try {
      const res = await bulkImportPrices(parsedItems);
      setResult(res);
      if (res.errors.length === 0) {
        setParsedItems([]);
        setJsonText("");
      }
    } finally {
      setSaving(false);
    }
  };

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
      activeTab === t
        ? "border-orange-500 text-orange-400 bg-gray-800"
        : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
    }`;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-700">
        <button className={tabClass("json")} onClick={() => setActiveTab("json")}>📋 Wklej JSON</button>
        <button className={tabClass("ocr")} onClick={() => setActiveTab("ocr")}>🖼️ OCR ze zdjęcia</button>
        <button className={tabClass("prompt")} onClick={() => setActiveTab("prompt")}>🤖 Wzór dla LLM</button>
      </div>

      {/* --- TAB: JSON PASTE --- */}
      {activeTab === "json" && (
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm text-gray-400 font-medium">Wklej JSON z cenami</label>
              <button
                onClick={() => copyToClipboard(PRICE_JSON_TEMPLATE, "json")}
                className="text-xs text-orange-400 hover:text-orange-300 border border-gray-700 px-2 py-1 rounded transition-colors"
              >
                {copied === "json" ? "✓ Skopiowano!" : "Kopiuj wzór"}
              </button>
            </div>
            <textarea
              value={jsonText}
              onChange={(e) => { setJsonText(e.target.value); }}
              placeholder={PRICE_JSON_TEMPLATE}
              rows={12}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm font-mono text-white focus:border-orange-500 outline-none resize-y"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => parseJSON(jsonText)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Parsuj JSON
            </button>
          </div>
          {parseError && <p className="text-red-400 text-sm">{parseError}</p>}
        </div>
      )}

      {/* --- TAB: OCR --- */}
      {activeTab === "ocr" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Wrzuć zrzut ekranu — OCR spróbuje odczytać tekst. Następnie wklej wynik do LLM z wzorem poniżej (zakładka "Wzór dla LLM"), żeby uzyskać JSON.</p>
          <div
            onClick={() => fileRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-gray-600 hover:border-orange-500 rounded-xl p-10 text-center cursor-pointer transition-colors"
          >
            {ocrImage
              ? <img src={ocrImage} alt="OCR preview" className="max-h-48 mx-auto rounded-lg object-contain" />
              : <div><p className="text-4xl mb-3">📷</p><p className="text-gray-400 text-sm">Kliknij lub przeciągnij zdjęcie tutaj</p></div>
            }
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

          {ocrRunning && (
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1"><span>Trwa OCR...</span><span>{ocrProgress}%</span></div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${ocrProgress}%` }} />
              </div>
            </div>
          )}

          {ocrText && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-300">Odczytany tekst (skopiuj do LLM)</label>
                <button
                  onClick={() => { navigator.clipboard.writeText(ocrText); setCopied("json"); setTimeout(() => setCopied(null), 2000); }}
                  className="text-xs text-orange-400 hover:text-orange-300 border border-gray-700 px-2 py-1 rounded"
                >
                  {copied === "json" ? "✓ Skopiowano!" : "Kopiuj tekst"}
                </button>
              </div>
              <textarea value={ocrText} onChange={e => setOcrText(e.target.value)} rows={8} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm font-mono text-gray-200 outline-none" />
            </div>
          )}
        </div>
      )}

      {/* --- TAB: LLM PROMPT --- */}
      {activeTab === "prompt" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Skopiuj poniższy prompt, wklej do modelu LLM (Claude, GPT, Gemini) razem z tekstem OCR lub zrzutem ekranu.</p>
          <div className="relative">
            <pre className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-sm text-gray-200 whitespace-pre-wrap font-mono overflow-x-auto">{LLM_PROMPT_TEMPLATE}</pre>
            <button
              onClick={() => copyToClipboard(LLM_PROMPT_TEMPLATE, "prompt")}
              className="absolute top-3 right-3 text-xs bg-gray-700 hover:bg-gray-600 text-orange-400 border border-gray-600 px-3 py-1.5 rounded-lg transition-colors"
            >
              {copied === "prompt" ? "✓ Skopiowano!" : "Kopiuj prompt"}
            </button>
          </div>
          <div className="bg-blue-950/40 border border-blue-800/50 rounded-lg p-4 text-sm text-blue-300">
            <strong>Jak używać:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-blue-200">
              <li>Wgraj zdjęcie do OCR (zakładka "OCR ze zdjęcia") lub zrób zrzut ekranu Steam</li>
              <li>Skopiuj ten prompt i wklej go do LLM (Claude/GPT/Gemini)</li>
              <li>Dodaj zdjęcie lub tekst OCR do wiadomości</li>
              <li>Skopiuj zwrócony JSON i wklej w zakładce "Wklej JSON"</li>
            </ol>
          </div>
        </div>
      )}

      {/* Preview parsed items */}
      {parsedItems.length > 0 && (
        <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-4 space-y-3">
          <h4 className="font-semibold text-gray-200">Podgląd ({parsedItems.length} rekordów):</h4>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {parsedItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2 text-sm">
                <div className="flex items-center gap-3">
                  {item.stattrak && <span className="text-orange-400 font-bold text-xs bg-orange-900/40 border border-orange-700 px-1.5 py-0.5 rounded">ST</span>}
                  <span className="font-medium">{item.skin}</span>
                  <span className="text-gray-500">{CONDITION_MAP[item.quality] ?? item.quality}</span>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <span className="text-green-400 font-semibold">${item.steamPrice.toFixed(2)}</span>
                  {item.externalPrice && <span className="text-gray-500 text-xs">Ext: ${item.externalPrice.toFixed(2)}</span>}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-colors"
          >
            {saving ? "Zapisywanie..." : `Zapisz ${parsedItems.length} rekordów do bazy`}
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`rounded-lg p-4 text-sm ${result.errors.length === 0 ? "bg-green-900/30 border border-green-700 text-green-300" : "bg-yellow-900/30 border border-yellow-700 text-yellow-300"}`}>
          <p className="font-semibold">✓ Zapisano {result.saved} rekordów</p>
          {result.errors.map((e, i) => <p key={i} className="text-red-400 mt-1">• {e}</p>)}
        </div>
      )}
    </div>
  );
}
