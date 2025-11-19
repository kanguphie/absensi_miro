
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { useData } from '../../contexts/DataContext';
import { useSettings } from '../../contexts/SettingsContext';
import { AttendanceStatus } from '../../types';
import { FiSend, FiCpu, FiUser, FiTrash2, FiDatabase, FiAlertTriangle, FiInfo } from 'react-icons/fi';

interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: Date;
    isError?: boolean;
}

const statusMap: { [key in AttendanceStatus]: string } = {
    [AttendanceStatus.PRESENT]: 'H',
    [AttendanceStatus.LATE]: 'T',
    [AttendanceStatus.SICK]: 'S',
    [AttendanceStatus.PERMIT]: 'I',
    [AttendanceStatus.ABSENT]: 'A',
    [AttendanceStatus.LEAVE_EARLY]: 'PC',
};

const AIRecapPage: React.FC = () => {
    const { students, classes, attendanceLogs } = useData();
    const { settings } = useSettings();
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome',
            role: 'model',
            text: 'Halo! Saya asisten data absensi sekolah Anda. Saya memiliki akses ke data siswa dan rekap kehadiran bulan ini. Apa yang ingin Anda tanyakan? Contoh: "Siapa yang paling sering terlambat?" atau "Tampilkan ringkasan kelas 1A".',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const buildSystemPrompt = () => {
        const today = new Date();
        const currentMonth = today.toISOString().slice(0, 7); // YYYY-MM
        
        // 1. Summarize Student Data (Lightweight)
        const studentSummary = students.map(s => {
            // Calculate stats for current month only to save tokens
            const logs = attendanceLogs.filter(l => 
                l.studentId === s.id && l.timestamp.toISOString().startsWith(currentMonth)
            );
            
            const stats = { H: 0, T: 0, S: 0, I: 0, A: 0, PC: 0 };
            logs.forEach(l => {
                if (l.type === 'in') {
                    const key = statusMap[l.status];
                    if (key && key in stats) stats[key as keyof typeof stats]++;
                }
            });
            
            const className = classes.find(c => c.id === s.classId)?.name || 'Unknown';
            return `ID:${s.nis}, Name:${s.name}, Class:${className}, Stats(Mth):${JSON.stringify(stats)}`;
        }).join('\n');

        // 2. Context Info
        const contextInfo = `
        Current Date: ${today.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        School Name: ${settings?.schoolName}
        Total Students: ${students.length}
        Classes: ${classes.map(c => c.name).join(', ')}
        Attendance Codes: H=Hadir(Present), T=Terlambat(Late), S=Sakit(Sick), I=Izin(Permit), A=Alfa(Absent), PC=Pulang Cepat(Early Leave)
        `;

        return `
        You are an AI Data Assistant for a school attendance system.
        Your goal is to answer questions based strictly on the provided data.
        
        === SCHOOL CONTEXT ===
        ${contextInfo}
        
        === STUDENT DATA (CURRENT MONTH STATS) ===
        ${studentSummary}
        
        === INSTRUCTIONS ===
        1. Answer in Bahasa Indonesia.
        2. Be professional, concise, and helpful.
        3. You can perform analysis like ranking (who is most late), counting (how many sick today), or summarizing class performance.
        4. If asked about data not present (e.g., grades, phone numbers), politely say you only have access to attendance data.
        5. Format your response nicely (use Markdown for lists, bold text, tables if necessary).
        6. When summarizing, mention the specific numbers.
        `;
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        // Graceful handling if API Key is not set in environment
        if (!process.env.API_KEY) {
             const errorMsg: ChatMessage = {
                id: Date.now().toString(),
                role: 'model',
                text: "⚠️ **API Key belum dikonfigurasi.**\n\nMohon tambahkan `API_KEY` ke dalam file `.env` di root project Anda, lalu restart server.\n\nContoh: `API_KEY=AIzaSy...`",
                timestamp: new Date(),
                isError: true
            };
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: input, timestamp: new Date() }, errorMsg]);
            setInput('');
            return;
        }

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);

        try {
            const systemPrompt = buildSystemPrompt();
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Construct history: Remove welcome message and any error messages
            const history = messages
                .filter(m => m.id !== 'welcome' && !m.isError)
                .map(m => ({
                    role: m.role,
                    parts: [{ text: m.text }]
                }));

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    ...history, 
                    { role: 'user', parts: [{ text: userMessage.text }] }
                ],
                config: {
                    systemInstruction: systemPrompt,
                }
            });

            const botMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: response.text || "Maaf, saya tidak dapat menghasilkan respons saat ini.",
                timestamp: new Date()
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (error: any) {
            console.error("AI Error:", error);
            let errorText = "Maaf, terjadi kesalahan saat menghubungi layanan AI.";
            
            if (error.message?.includes('API key')) {
                errorText = "⚠️ **API Key tidak valid.** Mohon periksa kembali API Key Anda di file `.env`.";
            } else if (error.message?.includes('quota')) {
                errorText = "⚠️ **Kuota API habis.** Mohon coba lagi nanti.";
            }

            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: errorText,
                timestamp: new Date(),
                isError: true
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="animate-fade-in h-[calc(100vh-140px)] flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                    <FiCpu className="text-indigo-600" />
                    Asisten Data AI
                </h1>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setMessages([messages[0]])} 
                        className="text-slate-500 hover:text-red-600 flex items-center gap-2 text-sm px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <FiTrash2 /> Reset Chat
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                    {messages.map((msg) => (
                        <div 
                            key={msg.id} 
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`flex max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center mx-2 ${
                                    msg.isError 
                                        ? 'bg-red-100 text-red-600' 
                                        : msg.role === 'user' 
                                            ? 'bg-indigo-600 text-white' 
                                            : 'bg-emerald-600 text-white'
                                }`}>
                                    {msg.isError ? <FiAlertTriangle size={16}/> : (msg.role === 'user' ? <FiUser size={16}/> : <FiCpu size={16}/>)}
                                </div>
                                <div 
                                    className={`p-3.5 rounded-2xl shadow-sm text-sm leading-relaxed ${
                                        msg.isError
                                        ? 'bg-red-50 text-red-800 border border-red-200 rounded-tl-none'
                                        : msg.role === 'user' 
                                            ? 'bg-indigo-600 text-white rounded-tr-none' 
                                            : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                                    }`}
                                >
                                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{
                                        __html: msg.text
                                          .replace(/\n/g, '<br/>')
                                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                          .replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono text-xs border border-slate-200">$1</code>')
                                    }} />
                                    <span className={`text-[10px] mt-2 block ${
                                        msg.isError 
                                        ? 'text-red-400' 
                                        : msg.role === 'user' 
                                            ? 'text-indigo-200' 
                                            : 'text-slate-400'
                                    }`}>
                                        {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="flex max-w-[80%] flex-row">
                                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-2">
                                    <FiCpu size={16}/>
                                </div>
                                <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-200 flex items-center gap-1">
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-5 bg-white border-t border-slate-200">
                    <form onSubmit={handleSend} className="relative">
                        <div className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Tanya tentang data absensi... (Contoh: 'Siapa yang paling sering terlambat?')"
                                className={`w-full border ${!process.env.API_KEY ? 'border-red-300 bg-red-50 focus:ring-red-200' : 'border-slate-300 focus:ring-indigo-500'} rounded-xl px-4 py-3 pr-14 focus:outline-none focus:ring-2 transition-all shadow-sm text-slate-800 placeholder-slate-400`}
                                disabled={isTyping}
                            />
                            <button 
                                type="submit" 
                                disabled={!input.trim() || isTyping}
                                className="absolute right-2 top-1.5 bottom-1.5 bg-indigo-600 text-white px-3 rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center shadow-sm aspect-square"
                            >
                                {isTyping ? <FiCpu className="animate-spin" /> : <FiSend />}
                            </button>
                        </div>
                    </form>
                    { !process.env.API_KEY && (
                        <p className="text-red-500 text-xs mt-2 flex items-center font-medium">
                            <FiAlertTriangle className="mr-1.5" size={14} />
                            API Key belum terdeteksi. Fitur ini mungkin tidak berfungsi.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIRecapPage;
