
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { useData } from '../../contexts/DataContext';
import { useSettings } from '../../contexts/SettingsContext';
import { AttendanceStatus } from '../../types';
import { FiSend, FiCpu, FiUser, FiTrash2, FiDatabase } from 'react-icons/fi';

const toLocalISOString = (date: Date) => {
    const tzoffset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - tzoffset).toISOString().slice(0, 10);
    return localISOTime;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: Date;
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
            
            const stats = { H: 0, T: 0, S: 0, I: 0, A: 0 };
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
        Current Date: ${today.toLocaleDateString('id-ID')}
        School Name: ${settings?.schoolName}
        Total Students: ${students.length}
        Classes: ${classes.map(c => c.name).join(', ')}
        `;

        return `
        You are an AI Data Assistant for a school attendance system.
        Your goal is to answer questions based strictly on the provided data.
        
        === SCHOOL CONTEXT ===
        ${contextInfo}
        
        === STUDENT DATA (CURRENT MONTH STATS: H=Hadir, T=Terlambat, S=Sakit, I=Izin, A=Alfa) ===
        ${studentSummary}
        
        === INSTRUCTIONS ===
        1. Answer in Bahasa Indonesia.
        2. Be professional, concise, and helpful.
        3. You can perform analysis like ranking (who is most late), counting (how many sick today), or summarizing class performance.
        4. If asked about data not present (e.g., grades, phone numbers), politely say you only have access to attendance data.
        5. Format your response nicely (use Markdown for lists, bold text, etc.).
        `;
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

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
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            // Construct chat history for context
            const history = messages.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    { role: 'user', parts: [{ text: systemPrompt }] }, // System instruction as first user message (common trick)
                    ...history, 
                    { role: 'user', parts: [{ text: userMessage.text }] }
                ]
            });

            const botMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: response.text,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error("AI Error:", error);
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: "Maaf, terjadi kesalahan saat memproses permintaan Anda. Pastikan API Key valid.",
                timestamp: new Date()
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
                <button 
                    onClick={() => setMessages([messages[0]])} 
                    className="text-slate-500 hover:text-red-600 flex items-center gap-2 text-sm px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                    <FiTrash2 /> Reset Chat
                </button>
            </div>

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                    {messages.map((msg) => (
                        <div 
                            key={msg.id} 
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`flex max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center mx-2 ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'}`}>
                                    {msg.role === 'user' ? <FiUser size={16}/> : <FiCpu size={16}/>}
                                </div>
                                <div 
                                    className={`p-3 rounded-2xl shadow-sm text-sm ${
                                        msg.role === 'user' 
                                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                                        : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                                    }`}
                                >
                                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{
                                        __html: msg.text
                                          .replace(/\n/g, '<br/>')
                                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                    }} />
                                    <span className={`text-[10px] mt-1 block ${msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
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
                <div className="p-4 bg-white border-t border-slate-200">
                    <form onSubmit={handleSend} className="flex gap-2 relative">
                        <div className="absolute -top-10 left-0 bg-indigo-50 text-indigo-700 text-xs px-3 py-1 rounded-full border border-indigo-100 flex items-center gap-1">
                            <FiDatabase size={12} />
                            <span>Konteks: {students.length} Siswa | {attendanceLogs.length} Log Absensi</span>
                        </div>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Tanya tentang data absensi..."
                            className="flex-1 border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            disabled={isTyping}
                        />
                        <button 
                            type="submit" 
                            disabled={!input.trim() || isTyping}
                            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors font-semibold flex items-center"
                        >
                            <FiSend className="mr-2" /> Kirim
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AIRecapPage;
