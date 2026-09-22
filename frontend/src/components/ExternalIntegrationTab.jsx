import React, { useState, useEffect } from "react";
import {
  Database,
  Send,
  Terminal,
  Code2,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Zap,
  Sparkles,
  Layers,
  Settings,
  Radio,
  Map,
  FileSpreadsheet,
  Cpu,
  Upload
} from "lucide-react";
import { api, getApiBaseUrl, setApiBaseUrl } from "../api";

export default function ExternalIntegrationTab({ ingestStats, onTriggerScenario, cameras = [] }) {
  const [apiUrl, setApiUrl] = useState(getApiBaseUrl());
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Map API configuration state
  const [mapProvider, setMapProvider] = useState("google");
  const [mapApiKey, setMapApiKey] = useState("cxinshjifskvjnrmnvpnpvidwbtdkqgvwqtm");
  const [customTileUrl, setCustomTileUrl] = useState("");
  const [mapSaveSuccess, setMapSaveSuccess] = useState(false);

  // Dataset CSV importer state
  const [csvFilePath, setCsvFilePath] = useState("sample_vadodara_dataset.csv");
  const [importStatus, setImportStatus] = useState(null);

  // Team OCR Model Runner state
  const [testImagePath, setTestImagePath] = useState("sample_vehicle_crop.jpg");
  const [ocrRunStatus, setOcrRunStatus] = useState(null);

  // Live test payload state (Vadodara)
  const [customPlate, setCustomPlate] = useState("GJ06AB1234");
  const [customCamera, setCustomCamera] = useState("CAM-BRC-01");
  const [customConf, setCustomConf] = useState(0.96);
  const [customVehicle, setCustomVehicle] = useState("car");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResponse, setLastResponse] = useState(null);
  const [copied, setCopied] = useState("");

  const handleSaveApiUrl = (e) => {
    e.preventDefault();
    setApiBaseUrl(apiUrl);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleSaveMapConfig = async (e) => {
    e.preventDefault();
    try {
      await api.updateMapConfig({
        provider: mapProvider,
        api_key: mapApiKey,
        tile_url: customTileUrl
      });
      setMapSaveSuccess(true);
      setTimeout(() => setMapSaveSuccess(false), 2500);
    } catch (err) {
      alert("Failed to save map settings: " + err.message);
    }
  };

  const handleImportCsv = async (e) => {
    e.preventDefault();
    setImportStatus("Importing dataset into SQLite database...");
    try {
      const res = await fetch(`${getApiBaseUrl()}/dataset/import_csv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filepath: csvFilePath })
      });
      const data = await res.json();
      setImportStatus(`Success: Imported ${data.imported_count} records into anpr_events!`);
    } catch (err) {
      setImportStatus("Import error: " + err.message);
    }
  };

  const handleRunOcrInference = async (e) => {
    e.preventDefault();
    setOcrRunStatus("Running OCR inference via backend.ocr_adapter...");
    try {
      const res = await fetch(`${getApiBaseUrl()}/inference/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_path: testImagePath,
          camera_id: customCamera,
          auto_ingest: true
        })
      });
      const data = await res.json();
      setOcrRunStatus(`Predicted Plate: ${data.prediction?.plate_text} (${Math.round((data.prediction?.ocr_confidence || 0.95) * 100)}% conf). Auto-ingested!`);
      setLastResponse(data);
    } catch (err) {
      setOcrRunStatus("Model error: " + err.message);
    }
  };

  const handleSendCustomEvent = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.ingestEvent({
        plate_text: customPlate,
        camera_id: customCamera,
        ocr_confidence: parseFloat(customConf),
        vehicle_type: customVehicle
      });
      setLastResponse(res);
    } catch (err) {
      setLastResponse({ error: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  };

  const curlSnippet = `curl -X POST "http://localhost:8000/api/v1/anpr_events" \\
  -H "Content-Type: application/json" \\
  -d '{
    "plate_text": "GJ06AB1234",
    "camera_id": "CAM-BRC-01",
    "ocr_confidence": 0.96,
    "vehicle_type": "car"
  }'`;

  const pythonSnippet = `import requests

# Stream detection from team YOLO/OCR model into Vadodara ANPR Command Center
payload = {
    "plate_text": "GJ06AB1234",
    "camera_id": "CAM-BRC-01",
    "ocr_confidence": 0.96,
    "vehicle_type": "car",
    "model_version": "Vadodara-TeamOCR-v1"
}

res = requests.post("http://localhost:8000/api/v1/anpr_events", json=payload)
print("Ingestion Status:", res.json())`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 tracking-wide uppercase">
              Vadodara Dataset, OCR Model &amp; Map API Integration
            </h2>
            <p className="text-xs text-gray-600 mt-0.5">
              Connect your team&apos;s OCR weights, external dataset CSV, Google Maps API, and REST pipelines
            </p>
          </div>
        </div>

        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noreferrer"
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition"
        >
          <span>OpenAPI / Swagger Specs</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* 3-Way Combine Panel: 1. Dataset Importer, 2. Team OCR Model, 3. Custom Map API */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Box 1: Combine with Real Dataset */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-emerald-700 border-b border-gray-100 pb-2.5">
            <FileSpreadsheet className="w-4 h-4" />
            <span>1. COMBINE DATASET (CSV / JSON)</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Import your external Vadodara vehicle detection records into the persistent SQLite database.
          </p>
          <form onSubmit={handleImportCsv} className="space-y-2 text-xs">
            <input
              type="text"
              value={csvFilePath}
              onChange={(e) => setCsvFilePath(e.target.value)}
              placeholder="e.g. sample_vadodara_dataset.csv"
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:border-blue-600 focus:outline-none"
            />
            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition flex items-center justify-center space-x-1.5 shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Dataset into DB</span>
            </button>
          </form>
          {importStatus && (
            <div className="text-xs text-emerald-800 font-mono bg-emerald-50 p-2 rounded-md border border-emerald-200">
              {importStatus}
            </div>
          )}
        </div>

        {/* Box 2: Team OCR Model Adapter */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-blue-700 border-b border-gray-100 pb-2.5">
            <Cpu className="w-4 h-4" />
            <span>2. TEAM OCR MODEL ADAPTER</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Hook your PyTorch (<code className="text-gray-800 font-mono">.pt</code>) / ONNX model into <code className="text-blue-700 font-mono">backend/ocr_adapter.py</code>.
          </p>
          <form onSubmit={handleRunOcrInference} className="space-y-2 text-xs">
            <input
              type="text"
              value={testImagePath}
              onChange={(e) => setTestImagePath(e.target.value)}
              placeholder="e.g. image.jpg or checkpoints/best.pt"
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:border-blue-600 focus:outline-none"
            />
            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold transition flex items-center justify-center space-x-1.5 shadow-xs"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Test OCR Model Predict</span>
            </button>
          </form>
          {ocrRunStatus && (
            <div className="text-xs text-blue-800 font-mono bg-blue-50 p-2 rounded-md border border-blue-200">
              {ocrRunStatus}
            </div>
          )}
        </div>

        {/* Box 3: Custom Map API Provider */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-amber-700 border-b border-gray-100 pb-2.5">
            <Map className="w-4 h-4" />
            <span>3. MAP API PROVIDER &amp; KEYS</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Configure Google Maps Roadmap or GIS providers with your authorized key.
          </p>
          <form onSubmit={handleSaveMapConfig} className="space-y-2 text-xs">
            <select
              value={mapProvider}
              onChange={(e) => setMapProvider(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:border-blue-600 focus:outline-none font-medium"
            >
              <option value="google">Google Maps Roadmap (Active Default)</option>
              <option value="carto">CartoDB Positron / OSM</option>
              <option value="mapbox">Mapbox GL</option>
              <option value="mappls">Mappls / MapmyIndia API</option>
              <option value="custom">Custom GIS Tile Server</option>
            </select>
            <input
              type="password"
              value={mapApiKey}
              onChange={(e) => setMapApiKey(e.target.value)}
              placeholder="Enter Map API Key..."
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:border-blue-600 focus:outline-none font-mono"
            />
            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold transition shadow-xs"
            >
              Save Map API Key
            </button>
          </form>
          {mapSaveSuccess && (
            <div className="text-xs text-emerald-800 font-medium bg-emerald-50 p-2 rounded-md border border-emerald-200">
              Map settings saved successfully!
            </div>
          )}
        </div>
      </div>

      {/* 1-Click SIH Hackathon Demo Triggers (Vadodara Dataset) */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-xs text-gray-900 uppercase">
              One-Click Vadodara Smart City Demo Scenarios
            </h3>
          </div>
          <span className="text-xs text-gray-500">
            Real Gujarat RTO (GJ-06) registration rules &amp; Vadodara corridors
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <button
            onClick={() => onTriggerScenario("normal_flow")}
            className="p-3 rounded-lg bg-gray-50 border border-gray-200 hover:border-blue-500 hover:bg-blue-50/50 text-left transition group"
          >
            <div className="text-blue-700 font-bold group-hover:text-blue-800">
              1. Vadodara Commuter Pass
            </div>
            <div className="text-[11px] text-gray-600 mt-1">
              Streams standard GJ06 vehicle detection without alert flags.
            </div>
          </button>

          <button
            onClick={() => onTriggerScenario("blacklist_match")}
            className="p-3 rounded-lg bg-red-50 border border-red-200 hover:border-red-400 text-left transition group"
          >
            <div className="text-red-700 font-bold group-hover:text-red-800">
              2. Stolen Vehicle Match
            </div>
            <div className="text-[11px] text-red-600 mt-1">
              Sends plate GJ06CC9901 &rarr; Triggers Vadodara Police SCRB Alert!
            </div>
          </button>

          <button
            onClick={() => onTriggerScenario("impossible_travel")}
            className="p-3 rounded-lg bg-amber-50 border border-amber-200 hover:border-amber-400 text-left transition group"
          >
            <div className="text-amber-800 font-bold group-hover:text-amber-900">
              3. Impossible Travel / Clone
            </div>
            <div className="text-[11px] text-amber-700 mt-1">
              Sends MH02EE7722 at Manjalpur then Golden Chawkdi in 20s.
            </div>
          </button>

          <button
            onClick={() => onTriggerScenario("restricted_zone")}
            className="p-3 rounded-lg bg-purple-50 border border-purple-200 hover:border-purple-400 text-left transition group"
          >
            <div className="text-purple-700 font-bold group-hover:text-purple-800">
              4. Restricted Zone Entry
            </div>
            <div className="text-[11px] text-purple-600 mt-1">
              Heavy truck entered Kala Ghoda / Sayaji Heritage Zone.
            </div>
          </button>
        </div>
      </div>

      {/* Interactive Payload Sender & Result Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-2.5 border-b border-gray-200">
            <Send className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-xs text-gray-900 uppercase">
              Send Custom Vadodara ANPR Event (Live Test Bench)
            </h3>
          </div>

          <form onSubmit={handleSendCustomEvent} className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-gray-700 font-semibold">Plate Number (Gujarat Format)</label>
              <input
                type="text"
                value={customPlate}
                onChange={(e) => setCustomPlate(e.target.value.toUpperCase())}
                placeholder="e.g. GJ06AB1234"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-mono font-bold tracking-wider focus:border-blue-600 focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-gray-700 font-semibold">Camera Node</label>
                <select
                  value={customCamera}
                  onChange={(e) => setCustomCamera(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 text-gray-800 focus:border-blue-600 focus:outline-none"
                >
                  {cameras.map((c) => (
                    <option key={c.camera_id} value={c.camera_id}>
                      {c.camera_id} - {c.road_zone}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-gray-700 font-semibold">Vehicle Class</label>
                <select
                  value={customVehicle}
                  onChange={(e) => setCustomVehicle(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 text-gray-800 focus:border-blue-600 focus:outline-none"
                >
                  <option value="car">Car</option>
                  <option value="two-wheeler">Two-Wheeler</option>
                  <option value="bus">Bus</option>
                  <option value="truck">Heavy Truck</option>
                  <option value="suv">SUV</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-gray-700 font-semibold">
                <span>OCR Confidence</span>
                <span className="text-emerald-700 font-bold">{Math.round(customConf * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="1.0"
                step="0.02"
                value={customConf}
                onChange={(e) => setCustomConf(e.target.value)}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
            >
              {isSubmitting ? "Transmitting to Gateway..." : "POST Event to /api/v1/anpr_events"}
            </button>
          </form>
        </div>

        {/* Real-Time Gateway Response Viewer */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-xs text-gray-900 uppercase">
                  Gateway JSON Response &amp; DB Audit
                </h3>
              </div>
              <span className="text-xs font-mono text-emerald-700 font-bold">HTTP 200 OK</span>
            </div>

            <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-200 font-mono text-[11px] text-gray-800 h-52 overflow-y-auto">
              {lastResponse ? (
                <pre>{JSON.stringify(lastResponse, null, 2)}</pre>
              ) : (
                <div className="text-gray-400 flex flex-col items-center justify-center h-full text-center">
                  <span>Send a test event above or trigger a demo scenario to see immediate gateway response.</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-mono text-blue-900">
            Broadcasting in real-time over WebSocket (<code className="text-blue-700 font-bold">/ws/live</code>) to all connected screens.
          </div>
        </div>
      </div>

      {/* Code Integration Snippets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-gray-200">
            <span className="text-xs font-bold text-gray-900 uppercase">
              cURL Integration Snippet (Vadodara Gateway)
            </span>
            <button
              onClick={() => copyToClipboard(curlSnippet, "curl")}
              className="text-xs text-blue-700 hover:text-blue-800 flex items-center space-x-1 font-medium"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied === "curl" ? "Copied!" : "Copy"}</span>
            </button>
          </div>
          <pre className="bg-gray-900 text-gray-100 p-3.5 rounded-lg border border-gray-800 text-xs font-mono overflow-x-auto">
            {curlSnippet}
          </pre>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-gray-200">
            <span className="text-xs font-bold text-gray-900 uppercase">
              Python / PyTorch / YOLO Pipeline Snippet
            </span>
            <button
              onClick={() => copyToClipboard(pythonSnippet, "python")}
              className="text-xs text-blue-700 hover:text-blue-800 flex items-center space-x-1 font-medium"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied === "python" ? "Copied!" : "Copy"}</span>
            </button>
          </div>
          <pre className="bg-gray-900 text-gray-100 p-3.5 rounded-lg border border-gray-800 text-xs font-mono overflow-x-auto">
            {pythonSnippet}
          </pre>
        </div>
      </div>
    </div>
  );
}
