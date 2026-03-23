"use client";

import { useState, useCallback, useRef } from "react";
import { createWorker } from "tesseract.js";
import { upsertSkins, type SkinUpsertItem } from "@/app/actions";
import { ALL_RARITIES } from "@/lib/rarity";

const SKIN_JSON_TEMPLATE = `[
  {
    "name": "Dispatch",
    "weapon": "P2000",
    "collection": "The Control Collection",
    "rarity": "Mil-Spec Grade",
    "minFloat": 0.00,
    "maxFloat": 0.65,
    "floatRequiredMin": 0.00,
    "floatRequiredMax": 0.107,
    "notes": "Warto robic FN pod kontrakt z Industrial Grade"
  }
]`;

const LLM_SKIN_PROMPT = `Wyciągnij dane o skinach CS2 z poniższego tekstu/zdjęcia i zwróć JSON array.

Wymagany format każdego elementu:
{
  "name": "Dispatch",            // tylko nazwa skina (bez nazwy broni)
  "weapon": "P2000",             // nazwa broni po angielsku
  "collection": "The Control Collection",
  "rarity": "Mil-Spec Grade",    // jeden z: Consumer Grade, Industrial Grade, Mil-Spec Grade, Restricted, Classified, Covert, Exceedingly Rare, Contraband
  "minFloat": 0.00,              // minimalna wartość float skina
  "maxFloat": 0.65,              // maksymalna wartość float skina
  "floatRequiredMin": 0.00,      // opcjonalnie: wymagane min float na inputach do kontraktu
  "floatRequiredMax": 0.107,     // opcjonalnie: wymagane max float na inputach
  "notes": ""                    // opcjonalnie: notatki
}

Zwróć TYLKO poprawny JSON array, bez żadnego tekstu poza nim.`;

type Tab = "json" | "ocr" | "prompt";

export default function SkinImportClient() {
  const [activeTab, setActiveTab] = useState<Tab>("json");
  const [jsonText, setJsonText] = useState("");
  const [parsedItems, setParsedItems] = useState<SkinUpsertItem[]>([]);
  const [parseError, setParseError] = useState("");
  const [result, setResult] = useState<{ saved: number; errors: string[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<"json" | "prompt" | null>(null);

  const [ocrImage, setOcrImage] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseJSON = useCallback((text: string) => {
    setParseError("");
    try {
      const raw = JSON.parse(text);
      const arr: SkinUpsertItem[] = Array.isArray(raw) ? raw : [raw];
      setParsedItems(arr);
    } catch {
      setParseError("Niepoprawny JSON.");
      setParsedItems([]);
    }
  }, []);

  const runOCR = useCallback(async (imageData: string) => {
    setOcrRunning(true);
    setOcrProgress(0);
    try {
      const worker = await createWorker("eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") setOcrProgress(Math.round(m.progress * 100));
        }
      });
      const { data: { text } } = await worker.recognize(imageData);
      await worker.terminate();
      setOcrText(text);
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

  const copy = (text: string, key: "json" | "prompt") => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    setResult(null);
    try {
      const res = await upsertSkins(parsedItems);
      setResult(res);
      if (res.errors.length === 0) { setParsedItems([]); setJsonText(""); }
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
      <div className="flex gap-1 border-b border-gray-700">
        <button className={tabClass("json")} onClick={() => setActiveTab("json")}>📋 Wklej JSON</button>
        <button className={tabClass("ocr")} onClick={() => setActiveTab("ocr")}>🖼️ OCR ze zdjęcia</button>
        <button className={tabClass("prompt")} onClick={() => setActiveTab("prompt")}>🤖 Wzór dla LLM</button>
      </div>

      {activeTab === "json" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm text-gray-400 font-medium">Wklej JSON ze skinami</label>
            <button onClick={() => copy(SKIN_JSON_TEMPLATE, "json")} className="text-xs text-orange-400 border border-gray-700 px-2 py-1 rounded">
              {copied === "json" ? "✓ Skopiowano!" : "Kopiuj wzór"}
            </button>
          </div>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder={SKIN_JSON_TEMPLATE}
            rows={14}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm font-mono text-white focus:border-orange-500 outline-none resize-y"
          />
          <button onClick={() => parseJSON(jsonText)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium">
            Parsuj JSON
          </button>
          {parseError && <p className="text-red-400 text-sm">{parseError}</p>}
        </div>
      )}

      {activeTab === "ocr" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Wrzuć zdjęcie — OCR odczyta tekst, który możesz przekopiować do LLM.</p>
          <div
            onClick={() => fileRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => { const d = ev.target?.result as string; setOcrImage(d); runOCR(d); }; r.readAsDataURL(f); }}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-gray-600 hover:border-orange-500 rounded-xl p-10 text-center cursor-pointer transition-colors"
          >
            {ocrImage ? <img src={ocrImage} alt="preview" className="max-h-48 mx-auto rounded-lg object-contain" /> : <div><p className="text-4xl mb-3">📷</p><p className="text-gray-400 text-sm">Kliknij lub przeciągnij zdjęcie</p></div>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          {ocrRunning && (
            <div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 transition-all" style={{ width: `${ocrProgress}%` }} />
              </div>
              <p className="text-xs text-gray-500 mt-1 text-right">{ocrProgress}%</p>
            </div>
          )}
          {ocrText && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-gray-300">Odczytany tekst</label>
                <button onClick={() => { navigator.clipboard.writeText(ocrText); setCopied("json"); setTimeout(() => setCopied(null), 2000); }} className="text-xs text-orange-400 border border-gray-700 px-2 py-1 rounded">
                  {copied === "json" ? "✓ Skopiowano!" : "Kopiuj"}
                </button>
              </div>
              <textarea value={ocrText} onChange={e => setOcrText(e.target.value)} rows={7} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm font-mono outline-none" />
            </div>
          )}
        </div>
      )}

      {activeTab === "prompt" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Skopiuj prompt i wyślij do LLM razem ze zdjęciem lub tekstem OCR.</p>
          <div className="relative">
            <pre className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-sm text-gray-200 whitespace-pre-wrap font-mono">{LLM_SKIN_PROMPT}</pre>
            <button onClick={() => copy(LLM_SKIN_PROMPT, "prompt")} className="absolute top-3 right-3 text-xs bg-gray-700 text-orange-400 border border-gray-600 px-3 py-1.5 rounded-lg">
              {copied === "prompt" ? "✓ Skopiowano!" : "Kopiuj prompt"}
            </button>
          </div>
          <div className="bg-blue-950/40 border border-blue-800/50 rounded-lg p-4 text-sm text-blue-200">
            <strong>Dostępne wartości rarity:</strong>
            <div className="mt-2 flex flex-wrap gap-2">
              {ALL_RARITIES.map(r => <code key={r} className="text-xs bg-gray-900 px-2 py-1 rounded">{r}</code>)}
            </div>
          </div>
        </div>
      )}

      {parsedItems.length > 0 && (
        <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-4 space-y-3">
          <h4 className="font-semibold text-gray-200">Podgląd ({parsedItems.length} skinów):</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {parsedItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{item.weapon} | {item.name}</span>
                  <span className="text-gray-500 ml-2 text-xs">{item.rarity}</span>
                </div>
                <span className="text-gray-400 text-xs">{item.collection}</span>
              </div>
            ))}
          </div>
          <button onClick={handleSave} disabled={saving} className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg">
            {saving ? "Zapisywanie..." : `Zapisz / Zaktualizuj ${parsedItems.length} skinów`}
          </button>
        </div>
      )}

      {result && (
        <div className={`rounded-lg p-4 text-sm ${result.errors.length === 0 ? "bg-green-900/30 border border-green-700 text-green-300" : "bg-yellow-900/30 border border-yellow-700 text-yellow-300"}`}>
          <p className="font-semibold">✓ Zapisano {result.saved} skinów</p>
          {result.errors.map((e, i) => <p key={i} className="text-red-400 mt-1">• {e}</p>)}
        </div>
      )}
    </div>
  );
}
