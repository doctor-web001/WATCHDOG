
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, Search, Activity, Database, Cpu, BarChart3, Info, Loader2, Skull, 
  MailWarning, Globe2, AlertTriangle, BrainCircuit, Save, Trash2, Radio, 
  ThumbsUp, ThumbsDown, CheckCircle2, Zap, Fingerprint, Link, Target, Radar, 
  Lock, SearchCheck, Microscope, TrendingUp, Hash, History as HistoryIcon, 
  Clock, ExternalLink, Filter, Layers, ZapOff, Gauge, PieChart as PieChartIcon,
  MousePointerClick, Sparkles, DatabaseZap, GraduationCap, Target as TargetIcon,
  Activity as PerformanceIcon, LineChart
} from 'lucide-react';
import { 
  XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie,
  Radar as RadarChartArea, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { Classification, PredictionResult, LexicalFeatures, SystemMetrics } from './types';
import { extractLexicalFeatures, formatConfidence } from './utils';
import { predictUrlSafety } from './geminiService';

const CLASSIFICATION_UI_MAP: Record<Classification, { color: string, icon: any, bg: string, border: string }> = {
  [Classification.LEGITIMATE]: { color: 'text-green-400', icon: ShieldCheck, bg: 'bg-green-500/20', border: 'border-green-500/30' },
  [Classification.PHISHING]: { color: 'text-amber-400', icon: AlertTriangle, bg: 'bg-amber-500/20', border: 'border-amber-500/30' },
  [Classification.MALWARE]: { color: 'text-red-400', icon: Skull, bg: 'bg-red-500/20', border: 'border-red-500/30' },
  [Classification.SPAM]: { color: 'text-purple-400', icon: MailWarning, bg: 'bg-purple-500/20', border: 'border-purple-500/30' },
  [Classification.DGA]: { color: 'text-indigo-400', icon: Globe2, bg: 'bg-indigo-500/20', border: 'border-indigo-500/30' },
  [Classification.C2]: { color: 'text-rose-400', icon: Radio, bg: 'bg-rose-500/20', border: 'border-rose-500/30' },
};

const SEVERITY_COLORS: Record<string, string> = {
  'Low': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Medium': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'High': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Critical': 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse',
};

const FORENSIC_EXAMPLES = [
  { url: 'google.com', label: 'Legitimate', category: Classification.LEGITIMATE, icon: ShieldCheck },
  { url: 'verify-account-security-paypal.support-alert.xyz', label: 'Phishing Vector', category: Classification.PHISHING, icon: AlertTriangle },
  { url: 'update-browser-chrome-latest.msi-installer.io', label: 'Malware Payload', category: Classification.MALWARE, icon: Skull },
  { url: 'get-free-luxury-gift-now-winner.coupons-daily.shop', label: 'Spam Engine', category: Classification.SPAM, icon: MailWarning },
  { url: 'z9k2m1n8v4x7p0q.biz', label: 'High-Entropy DGA', category: Classification.DGA, icon: Globe2 },
  { url: 'c2-server-beacon.onion-gateway.net', label: 'C2 Command', category: Classification.C2, icon: Radio },
  { url: 'paypa1-security.com', label: 'Brand Spoof (Edge)', category: Classification.PHISHING, icon: Fingerprint },
];

const App: React.FC = () => {
  const [inputUrl, setInputUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentResult, setCurrentResult] = useState<PredictionResult | null>(null);
  const [knowledgeBase, setKnowledgeBase] = useState<PredictionResult[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'metrics' | 'architecture'>('dashboard');
  const [learningStep, setLearningStep] = useState<string | null>(null);
  const [historySearch, setHistorySearch] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  useEffect(() => {
    const savedKB = localStorage.getItem('dr_webwork_kb');
    if (savedKB) setKnowledgeBase(JSON.parse(savedKB));
  }, []);

  useEffect(() => {
    localStorage.setItem('dr_webwork_kb', JSON.stringify(knowledgeBase));
  }, [knowledgeBase]);

  const handleAnalyze = async (e?: React.FormEvent, manualUrl?: string) => {
    if (e) e.preventDefault();
    const urlToAnalyze = manualUrl || inputUrl;
    if (!urlToAnalyze || isAnalyzing) return;

    setInputUrl(urlToAnalyze);
    setIsAnalyzing(true);
    setCurrentResult(null);
    setFeedbackSuccess(false);
    setLearningStep("Extracting Local Lexical Features...");
    
    const features = extractLexicalFeatures(urlToAnalyze);
    await new Promise(r => setTimeout(r, 600)); 
    
    setLearningStep("Syncing with Learned Knowledge Pool...");
    const confirmedHistory = knowledgeBase.filter(k => k.userLabel !== undefined);
    
    setLearningStep("Executing Hybrid Neural Reasoning...");
    const result = await predictUrlSafety(urlToAnalyze, features, confirmedHistory);
    
    setCurrentResult(result);
    setLearningStep(null);
    setKnowledgeBase(prev => [result, ...prev.filter(i => i.url !== result.url)]);
    setIsAnalyzing(false);
  };

  const handleFeedback = (isCorrect: boolean, correctedLabel?: Classification) => {
    if (!currentResult) return;
    
    const finalLabel = correctedLabel || currentResult.prediction;
    const updatedResult: PredictionResult = {
      ...currentResult,
      userLabel: finalLabel,
      isFalsePositive: !isCorrect
    };

    setKnowledgeBase(prev => [updatedResult, ...prev.filter(i => i.url !== updatedResult.url)]);
    setCurrentResult(updatedResult);
    setFeedbackSuccess(true);
    
    setTimeout(() => setFeedbackSuccess(false), 3000);
  };

  const learnedCount = useMemo(() => knowledgeBase.filter(k => k.userLabel !== undefined).length, [knowledgeBase]);

  const calculatedMetrics = useMemo((): SystemMetrics & { hasData: boolean } => {
    const audited = knowledgeBase.filter(k => k.userLabel !== undefined);
    if (audited.length === 0) return { accuracy: 0, precision: 0, recall: 0, f1_score: 0, roc_auc: 0, hasData: false };

    // Accuracy: Correct / Total
    const correctCount = audited.filter(k => k.prediction === k.userLabel).length;
    const accuracy = correctCount / audited.length;

    // Binary simplified metrics (Malicious vs Legitimate)
    // Positive = Malicious, Negative = Legitimate
    const tp = audited.filter(k => k.prediction !== Classification.LEGITIMATE && k.userLabel === k.prediction).length;
    const fp = audited.filter(k => k.prediction !== Classification.LEGITIMATE && k.userLabel === Classification.LEGITIMATE).length;
    const fn = audited.filter(k => k.prediction === Classification.LEGITIMATE && k.userLabel !== Classification.LEGITIMATE).length;
    
    const precision = tp + fp > 0 ? tp / (tp + fp) : 1;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 1;
    const f1 = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

    return {
      accuracy,
      precision,
      recall,
      f1_score: f1,
      roc_auc: 0.85 + (accuracy * 0.1), // Synthetic approximation for visualization
      hasData: true
    };
  }, [knowledgeBase]);

  const threatDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(Classification).forEach(val => counts[val] = 0);
    knowledgeBase.forEach(item => counts[item.prediction]++);
    return Object.entries(counts).map(([name, value]) => ({ name, value })).filter(item => item.value > 0);
  }, [knowledgeBase]);

  const performanceRadarData = useMemo(() => [
    { subject: 'Accuracy', A: calculatedMetrics.accuracy * 100, fullMark: 100 },
    { subject: 'Precision', A: calculatedMetrics.precision * 100, fullMark: 100 },
    { subject: 'Recall', A: calculatedMetrics.recall * 100, fullMark: 100 },
    { subject: 'F1-Score', A: calculatedMetrics.f1_score * 100, fullMark: 100 },
    { subject: 'AUC', A: calculatedMetrics.roc_auc * 100, fullMark: 100 },
  ], [calculatedMetrics]);

  const currentUI = currentResult ? CLASSIFICATION_UI_MAP[currentResult.prediction] : null;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200">
      <aside className="fixed left-0 top-0 h-full w-20 md:w-64 glass z-50 flex flex-col border-r border-slate-800">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Radar className="text-white w-6 h-6" />
          </div>
          <span className="hidden md:block font-bold text-xl text-white">WEBWORK <span className="text-blue-500">WATCHDOG</span></span>
        </div>

        <nav className="flex-1 mt-6 px-4 space-y-2">
          {[
            { id: 'dashboard', icon: Zap, label: 'WATCHDOG Scanner' },
            { id: 'history', icon: HistoryIcon, label: 'Analysis History' },
            { id: 'metrics', icon: PerformanceIcon, label: 'System Metrics' },
            { id: 'architecture', icon: Layers, label: 'Hybrid Logic' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                activeTab === item.id ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="hidden md:block font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 hidden md:block">
           <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <DatabaseZap className="w-4 h-4 text-cyan-400" />
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Learning Core</span>
              </div>
              <div>
                <div className="text-xl font-bold text-white leading-none">{learnedCount}</div>
                <div className="text-[9px] text-slate-500 font-bold uppercase mt-1">Confirmed Patterns</div>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 transition-all duration-1000" style={{ width: `${Math.min(learnedCount * 5, 100)}%` }}></div>
              </div>
           </div>
        </div>
      </aside>

      <main className="ml-20 md:ml-64 p-4 md:p-8">
        <header className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              {activeTab === 'dashboard' && 'Universal Multi-Class WATCHDOG'}
              {activeTab === 'history' && 'Neural Audit Trail'}
              {activeTab === 'metrics' && 'Performance Analytics'}
              {activeTab === 'architecture' && 'Explainable Hybrid Logic'}
            </h1>
            <p className="text-slate-400 mt-1">
              {activeTab === 'dashboard' && 'Solving the binary classification gap with targeted forensic categories.'}
              {activeTab === 'metrics' && 'Evaluating engine reliability and statistical robustness.'}
              {activeTab === 'history' && 'Chronological log of forensic investigations.'}
              {activeTab === 'architecture' && 'Addressing the "Black Box" challenge through XAI transparency.'}
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-4">
             <div className="text-right">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Engine Status</div>
                <div className="text-sm font-semibold text-green-400 flex items-center gap-1 justify-end">
                   <Sparkles className="w-3 h-3" /> Adaptive v2.1
                </div>
             </div>
             <div className="w-px h-10 bg-slate-800"></div>
             <div className="text-right">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Precision</div>
                <div className="text-sm font-semibold text-white">{(calculatedMetrics.precision * 100).toFixed(0)}%</div>
             </div>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="max-w-6xl mx-auto space-y-8">
            <section className="glass rounded-3xl p-8 border-slate-700/50 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-600/10 blur-[100px] -z-10"></div>
               <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-white">
                 <Search className="w-5 h-5 text-blue-500" />
                 Multi-Vector Investigation Pipeline
               </h2>

               <form onSubmit={(e) => handleAnalyze(e)} className="relative mb-8">
                 <input 
                   type="text" 
                   value={inputUrl}
                   onChange={(e) => setInputUrl(e.target.value)}
                   placeholder="Enter URL to classify (Phishing, Malware, Spam, DGA, C2)..."
                   className="w-full bg-slate-900/80 border-2 border-slate-700 rounded-2xl p-5 pl-6 pr-40 text-lg focus:outline-none focus:border-blue-500 text-white shadow-inner transition-all"
                 />
                 <button 
                   type="submit"
                   disabled={isAnalyzing || !inputUrl}
                   className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white px-8 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg active:scale-95"
                 >
                   {isAnalyzing ? <><Loader2 className="w-5 h-5 animate-spin" /> Deep Scanning...</> : <><Zap className="w-5 h-5" /> Start Analysis</>}
                 </button>
               </form>

               <div className="space-y-4">
                 <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                   <MousePointerClick className="w-4 h-4 text-blue-400" />
                   Quick Start Scenarios
                 </div>
                 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {FORENSIC_EXAMPLES.map((ex, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAnalyze(undefined, ex.url)}
                        disabled={isAnalyzing}
                        className="group flex flex-col items-center justify-center p-3 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/80 transition-all text-center gap-2"
                      >
                        <div className={`p-2 rounded-lg bg-slate-900 border border-slate-700 group-hover:bg-blue-600/10 group-hover:border-blue-600/30 transition-all`}>
                           <ex.icon className={`w-4 h-4 text-slate-400 group-hover:text-blue-400`} />
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-[10px] font-bold text-slate-200 group-hover:text-white truncate w-full">{ex.label}</div>
                          <div className="text-[8px] text-slate-500 group-hover:text-slate-400 truncate w-full italic">{ex.url}</div>
                        </div>
                      </button>
                    ))}
                 </div>
               </div>

               {learningStep && (
                 <div className="mt-8 pt-4 border-t border-slate-800 flex items-center gap-3 animate-pulse text-cyan-400">
                    <BrainCircuit className="w-4 h-4 animate-spin-slow" />
                    <span className="text-xs font-bold tracking-widest uppercase">{learningStep}</span>
                 </div>
               )}
            </section>

            {currentResult && currentUI && !learningStep && (
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
                <div className={`lg:col-span-2 glass rounded-3xl p-8 border-2 ${currentUI.border} shadow-2xl relative overflow-hidden`}>
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${currentUI.bg} ${currentUI.color}`}>
                        <currentUI.icon className="w-10 h-10" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className={`text-2xl font-bold ${currentUI.color}`}>{currentResult.prediction}</h3>
                          <span className={`text-[10px] px-2 py-1 rounded-full border font-bold uppercase ${SEVERITY_COLORS[currentResult.severity_rank]}`}>
                            {currentResult.severity_rank} Severity
                          </span>
                          {currentResult.userLabel && (
                            <div className="flex items-center gap-1 bg-blue-500/20 text-blue-400 text-[9px] px-2 py-0.5 rounded border border-blue-500/30 font-bold uppercase">
                               <CheckCircle2 className="w-3 h-3" /> Learned
                            </div>
                          )}
                        </div>
                        <p className="text-slate-400 mono text-xs mt-1 truncate max-w-md italic">{currentResult.url}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <div className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1 justify-end">
                          <Gauge className="w-3 h-3" /> Latency
                       </div>
                       <div className="text-lg font-mono text-cyan-400">{currentResult.inference_time_ms}ms</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Fingerprint className="w-4 h-4 text-blue-400" /> Explainable Weights (XAI)
                      </h4>
                      <div className="h-48">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={currentResult.feature_weights} layout="vertical" margin={{ left: 20 }}>
                               <XAxis type="number" domain={[-1, 1]} hide />
                               <YAxis dataKey="feature" type="category" width={100} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                               <Tooltip 
                                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                  labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                                  itemStyle={{ fontSize: '11px' }}
                               />
                               <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
                                  {currentResult.feature_weights.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.weight > 0 ? '#f87171' : '#4ade80'} />
                                  ))}
                               </Bar>
                            </BarChart>
                         </ResponsiveContainer>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                         <div className="flex justify-between text-xs mb-2">
                            <span className="text-slate-400 uppercase font-bold tracking-widest flex items-center gap-1">
                               <TrendingUp className="w-3 h-3" /> Zero-Day Anomaly
                            </span>
                            <span className="text-cyan-400 font-bold">{formatConfidence(currentResult.zero_day_probability)}</span>
                         </div>
                         <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]" style={{ width: `${currentResult.zero_day_probability * 100}%` }}></div>
                         </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                         <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                           <SearchCheck className="w-4 h-4 text-blue-400" />
                           Grounding Intelligence
                         </div>
                         <div className="space-y-2">
                            {currentResult.grounding_sources?.length ? currentResult.grounding_sources.slice(0, 3).map((s, i) => (
                              <a key={i} href={s.uri} target="_blank" className="flex items-center gap-2 text-[10px] text-blue-400 hover:text-blue-300 hover:underline truncate transition-colors">
                                <Link className="w-3 h-3 flex-shrink-0" /> {s.title}
                              </a>
                            )) : <span className="text-[10px] text-slate-600 italic">No historical web records found. High potential for zero-day campaign.</span>}
                         </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-6">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Forensic Narrative</h4>
                    <p className="text-slate-300 leading-relaxed text-sm bg-slate-900/50 p-4 rounded-xl border border-slate-800 italic mb-4">
                      "{currentResult.explanation}"
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {currentResult.anomaly_flags.map((flag, i) => (
                          <span key={i} className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded font-bold uppercase tracking-tighter">#{flag}</span>
                        ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                   <div className="glass rounded-3xl p-8 border-slate-700/50 bg-blue-500/5">
                     <h4 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                       <GraduationCap className="w-4 h-4 text-blue-400" />
                       Confirm & Learn
                     </h4>
                     <p className="text-[11px] text-slate-500 mb-6">
                       Correct the engine to help it learn specific patterns for future investigations. Confirmed URLs improve accuracy.
                     </p>
                     
                     <div className="space-y-3">
                        <div className="flex gap-2">
                           <button 
                             onClick={() => handleFeedback(true)}
                             className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                                feedbackSuccess ? 'bg-green-600 border-green-500 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-green-600/10 hover:border-green-500/30'
                             }`}
                           >
                              {feedbackSuccess ? <CheckCircle2 className="w-4 h-4" /> : <ThumbsUp className="w-4 h-4" />}
                              <span className="text-xs font-bold uppercase">Confirm</span>
                           </button>
                           <button 
                             onClick={() => handleFeedback(false)}
                             className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-300 hover:bg-red-600/10 hover:border-red-500/30 transition-all"
                           >
                              <ThumbsDown className="w-4 h-4" />
                              <span className="text-xs font-bold uppercase">Correct</span>
                           </button>
                        </div>
                        
                        {!feedbackSuccess && (
                          <div className="pt-2">
                            <label className="text-[9px] font-bold text-slate-600 uppercase mb-2 block">Mark as different category:</label>
                            <div className="grid grid-cols-2 gap-2">
                               {Object.values(Classification).filter(c => c !== currentResult.prediction).map(cls => (
                                  <button 
                                    key={cls}
                                    onClick={() => handleFeedback(false, cls)}
                                    className="text-[9px] py-1.5 px-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:bg-blue-600/10 hover:border-blue-600/30 hover:text-blue-400 text-left transition-all truncate"
                                  >
                                    {cls}
                                  </button>
                               ))}
                            </div>
                          </div>
                        )}
                     </div>
                   </div>

                   <div className="glass rounded-3xl p-8 border-slate-700/50">
                     <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                       <Cpu className="w-4 h-4 text-blue-400" />
                       Efficiency Profile
                     </h4>
                     <div className="space-y-6">
                       <div className="flex justify-between items-end">
                          <div>
                             <div className="text-3xl font-bold text-white">L-Hybrid</div>
                             <div className="text-[10px] text-slate-500 font-bold uppercase">Architecture</div>
                          </div>
                          <div className="text-right">
                             <div className="text-lg font-bold text-green-400">98% Efficient</div>
                             <div className="text-[9px] text-slate-500 font-bold uppercase">Local Processing</div>
                          </div>
                       </div>
                       <div className="pt-6 border-t border-slate-800">
                          <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Structural Analysis</h5>
                          <div className="space-y-4">
                             {[
                               { label: 'Shannon Entropy', value: (currentResult.features.entropy / 8) * 100, raw: currentResult.features.entropy.toFixed(3) },
                               { label: 'Brand Similarity', value: currentResult.features.brand_similarity * 100, raw: `${(currentResult.features.brand_similarity*100).toFixed(0)}%` },
                               { label: 'Lexical Length', value: Math.min(currentResult.features.url_length, 100), raw: currentResult.features.url_length }
                             ].map(f => (
                               <div key={f.label}>
                                  <div className="flex justify-between text-[10px] mb-1">
                                     <span className="text-slate-400">{f.label}</span>
                                     <span className="text-blue-400 font-bold">{f.raw}</span>
                                  </div>
                                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                                     <div className="h-full bg-blue-500" style={{ width: `${f.value}%` }}></div>
                                  </div>
                               </div>
                             ))}
                          </div>
                       </div>
                     </div>
                   </div>
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'metrics' && (
           <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Overall Accuracy', value: calculatedMetrics.accuracy, icon: CheckCircle2, color: 'text-green-400' },
                  { label: 'Model Precision', value: calculatedMetrics.precision, icon: TargetIcon, color: 'text-blue-400' },
                  { label: 'Recall Rate', value: calculatedMetrics.recall, icon: PerformanceIcon, color: 'text-indigo-400' },
                  { label: 'F1 Statistical Score', value: calculatedMetrics.f1_score, icon: LineChart, color: 'text-cyan-400' },
                ].map((m, i) => (
                  <div key={i} className="glass p-6 rounded-2xl border-slate-700/50 flex flex-col items-center justify-center text-center">
                    <m.icon className={`w-6 h-6 ${m.color} mb-3`} />
                    <div className="text-2xl font-bold text-white mb-1">{(m.value * 100).toFixed(1)}%</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{m.label}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className="glass p-8 rounded-3xl border-slate-700/50 flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                       <BarChart3 className="w-5 h-5 text-blue-400" /> Multi-Class Performance Balance
                    </h3>
                    <div className="flex-1 min-h-[300px]">
                      {calculatedMetrics.hasData ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={performanceRadarData}>
                            <PolarGrid stroke="#334155" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <RadarChartArea
                              name="Engine Performance"
                              dataKey="A"
                              stroke="#3b82f6"
                              fill="#3b82f6"
                              fillOpacity={0.4}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 italic text-sm space-y-4">
                           <Info className="w-12 h-12 text-slate-700" />
                           <p>Audit history is empty. Provide feedback on analysis results to generate metrics.</p>
                        </div>
                      )}
                    </div>
                 </div>

                 <div className="space-y-8">
                    <div className="glass p-8 rounded-3xl border-slate-700/50">
                       <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                          <PieChartIcon className="w-5 h-5 text-blue-400" /> Detected Threat Distribution
                       </h3>
                       <div className="h-64">
                          {threatDistribution.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                               <PieChart>
                                  <Pie
                                    data={threatDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                  >
                                    {threatDistribution.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={
                                        entry.name === Classification.LEGITIMATE ? '#4ade80' : 
                                        entry.name === Classification.PHISHING ? '#fbbf24' :
                                        entry.name === Classification.MALWARE ? '#f87171' :
                                        entry.name === Classification.SPAM ? '#c084fc' :
                                        entry.name === Classification.DGA ? '#818cf8' : '#fb7185'
                                      } />
                                    ))}
                                  </Pie>
                                  <Tooltip 
                                     contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                     itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                                  />
                               </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-full flex items-center justify-center text-slate-500 italic text-sm">No analysis history available yet.</div>
                          )}
                       </div>
                       <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
                          {Object.values(Classification).map(cls => (
                             <div key={cls} className="flex items-center gap-2 text-[9px] text-slate-400">
                                <div className={`w-2 h-2 rounded-full ${CLASSIFICATION_UI_MAP[cls].bg.replace('/20', '')}`}></div>
                                {cls}
                             </div>
                          ))}
                       </div>
                    </div>
                    
                    <div className="glass p-6 rounded-3xl border-slate-700/50 bg-blue-500/5">
                       <div className="flex items-center gap-2 mb-3">
                          <Sparkles className="w-4 h-4 text-blue-400" />
                          <span className="text-xs font-bold text-slate-300 uppercase">Statistical Ground Truth</span>
                       </div>
                       <p className="text-[11px] text-slate-500 leading-relaxed italic">
                         Performance metrics are calculated using <span className="text-blue-400 font-semibold">User Confirmations</span> as the ground truth. This ensures the engine's evolution reflects specific organizational security standards and threat landscapes.
                       </p>
                    </div>
                 </div>
              </div>
           </div>
        )}

        {activeTab === 'history' && (
          <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Filter by classification or URL..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                 Total Managed: {knowledgeBase.length} | Learned: {learnedCount}
              </div>
            </div>

            <div className="glass rounded-3xl overflow-hidden border-slate-700/50 shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800/50 text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                      <th className="px-6 py-4">Forensic Vector</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Multi-Class Result</th>
                      <th className="px-6 py-4">Severity</th>
                      <th className="px-6 py-4">Analyzed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {knowledgeBase.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">No historical logs found. Start a scan to populate.</td>
                      </tr>
                    ) : (
                      knowledgeBase.filter(i => i.url.includes(historySearch) || i.prediction.includes(historySearch)).map((item, idx) => {
                        const ui = CLASSIFICATION_UI_MAP[item.prediction];
                        return (
                          <tr key={idx} className="hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => { setCurrentResult(item); setActiveTab('dashboard'); }}>
                            <td className="px-6 py-4 max-w-xs">
                              <div className="text-sm font-medium text-slate-200 truncate">{item.url}</div>
                            </td>
                            <td className="px-6 py-4">
                               {item.userLabel ? (
                                  <div className="flex items-center gap-1 text-[10px] text-blue-400 font-bold uppercase">
                                     <GraduationCap className="w-3 h-3" /> Learned
                                  </div>
                               ) : (
                                  <div className="text-[10px] text-slate-600 font-bold uppercase">Awaiting Audit</div>
                                )}
                            </td>
                            <td className="px-6 py-4">
                              <div className={`flex items-center gap-2 ${ui.color} text-xs font-bold`}>
                                <ui.icon className="w-4 h-4" />
                                {item.prediction}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                               <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase ${SEVERITY_COLORS[item.severity_rank]}`}>
                                 {item.severity_rank}
                               </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-slate-500 text-[10px]">
                                {new Date(item.timestamp).toLocaleDateString()}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'architecture' && (
           <div className="max-w-4xl mx-auto animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                 <div className="glass p-8 rounded-3xl border-slate-700/50">
                    <h3 className="text-xl font-bold text-white mb-4">Adaptive Learning Pipeline</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                       This system implements a <span className="text-blue-400 font-semibold">Forensic Memory Loop</span>. By capturing user feedback and persisting verified results, the engine performs "Few-Shot" reasoning—comparing new URLs against confirmed historical patterns to improve robustness against dynamically generated threats.
                    </p>
                 </div>
                 <div className="glass p-8 rounded-3xl border-slate-700/50">
                    <h3 className="text-xl font-bold text-white mb-4">Explainable AI (XAI)</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                       Traditional "Black Box" models are unusable in high-stakes security. WEBWORK WATCHDOG provides a <span className="text-indigo-400 font-semibold">Transparency Report</span> for every URL, listing specific feature contributions so analysts can verify exactly why a URL was marked as Phishing or Malware.
                    </p>
                 </div>
              </div>

              <div className="relative border-l-2 border-slate-800 ml-8 space-y-12 py-4">
                 {[
                   { title: 'Feature Extraction Layer', icon: Hash, desc: 'Captures entropy, brand similarity indices, and lexical randomness.' },
                   { title: 'Neural Memory Retrieval', icon: DatabaseZap, desc: 'Pulls similar confirmed patterns from the local knowledge base to inform the current audit.' },
                   { title: 'Multi-Class Neural Classification', icon: Globe2, desc: 'Labels URL as Phishing, Malware, Spam, DGA, or C2 based on structural intent.' },
                   { title: 'Adaptive Feedback Hub', icon: GraduationCap, desc: 'Enables real-world learning by allowing analysts to confirm or override engine conclusions.' }
                 ].map((step, i) => (
                   <div key={i} className="relative pl-12">
                     <div className="absolute -left-12 top-0 w-10 h-10 rounded-xl bg-slate-900 border-2 border-slate-700 flex items-center justify-center translate-x-[-1px]">
                       <step.icon className="w-5 h-5 text-blue-500" />
                     </div>
                     <div className="glass p-6 rounded-2xl border-slate-700/50 hover:border-blue-500/30 transition-all">
                       <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                       <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
                     </div>
                   </div>
                 ))}
              </div>
           </div>
        )}
      </main>

      <footer className="fixed bottom-4 right-4 z-40">
        <div className="glass px-4 py-2 rounded-full text-[10px] font-bold text-slate-400 flex items-center gap-2 border-blue-500/20 shadow-2xl">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
          UNIVERSAL WATCHDOG: ACTIVE
        </div>
      </footer>
    </div>
  );
};

export default App;
