'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2, MessageCircle, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: string[];
  related?: string[];
}

interface ChatResponse {
  answer?: string;
  sources?: string[];
  related?: string[];
}

const suggestedQuestions = {
  en: [
    'How does the Sample Quiz work?',
    'What product categories can I order?',
    'How long does sample development take?',
    'Can I customize the formula and packaging?',
    'What certifications does KCC hold?',
    'Which countries do you ship to?',
    'What are your minimum order quantities?',
    'Tell me about KCC and your story.',
  ],
  ar: [
    'إزاي بيشتغل كويز السامبل؟',
    'إيه الكاتيجوريز اللي أقدر أطلبها؟',
    'تطوير العينة بياخد قد إيه؟',
    'أقدر أخصّص التركيبة والتغليف؟',
    'إيه شهادات KCC؟',
    'بتشحنوا لأي دول؟',
    'الحد الأدنى للطلب كام؟',
    'احكيلي عن KCC وقصة الشركة.',
  ],
};

const pinnedQuickQuestions = {
  en: ['Start sample quiz', 'Hair care products', 'Skin care products', 'Custom fragrance', 'Packaging options'],
  ar: ['ابدأ كويز السامبل', 'منتجات العناية بالشعر', 'منتجات العناية بالبشرة', 'عطر مخصص', 'خيارات التغليف'],
};

export default function AIAssistantPage() {
  const { locale, t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: locale === 'ar'
        ? 'مرحباً! أنا المساعد الذكي لـ KCC. كيف يمكنني مساعدتك اليوم؟'
        : 'Hello! I\'m KCC\'s AI Assistant. How can I help you today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = async (text?: string) => {
    const messageText = (text || input).trim();
    if (!messageText || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/knowledge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText, locale }),
      });

      let data: ChatResponse = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer || getLocalFallback(locale),
        timestamp: new Date(),
        sources: Array.isArray(data.sources) ? data.sources : [],
        related: Array.isArray(data.related) ? data.related : [],
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getLocalFallback(locale),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const currentSuggestions = suggestedQuestions[locale === 'ar' ? 'ar' : 'en'];
  const currentPinned = pinnedQuickQuestions[locale === 'ar' ? 'ar' : 'en'];
  const showInitialSuggestions = messages.length <= 1;

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 4rem)' }}>
      <div className="border-b border-cream-300 bg-white/85">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-kcc-green/15 text-kcc-green flex items-center justify-center">
              <Bot size={22} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-ink-700">
                {t('ai.title')}
              </h1>
              <p className="text-xs text-cream-700">
                {t('ai.subtitle')}
              </p>
            </div>
            <div className="ms-auto flex items-center gap-1.5 px-2.5 py-1 bg-kcc-green/10 rounded-full">
              <span className="w-2 h-2 rounded-full bg-kcc-green animate-pulse" />
              <span className="text-xs text-kcc-green font-medium">{locale === 'ar' ? 'متصل' : 'Online'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-kcc-green/15 text-kcc-green flex items-center justify-center mt-1">
                    <Bot size={16} />
                  </div>
                )}

                <div className="max-w-[84%]">
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'bg-kcc-green text-white rounded-br-md'
                      : 'bg-cream-200 text-ink-700 border border-cream-400 rounded-bl-md'
                  }`}>
                    {msg.content}
                  </div>

                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-1.5 px-1">
                      <p className="text-[10px] text-cream-800 mb-1">{locale === 'ar' ? 'المصادر:' : 'Sources:'}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((source, i) => (
                          <button
                            type="button"
                            key={`${source}-${i}`}
                            onClick={() => sendMessage(source)}
                            disabled={isTyping}
                            className="text-[10px] px-2 py-0.5 bg-cream-200 text-cream-800 rounded-full border border-cream-400 hover:border-kcc-green/40 hover:text-kcc-green transition-all disabled:opacity-50"
                            title={locale === 'ar' ? 'اسأل بهذا السؤال' : 'Ask this question'}
                          >
                            {source}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {msg.related && msg.related.length > 0 && msg.role === 'assistant' && (
                    <div className="mt-3 px-1">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-kcc-rose-dark font-semibold mb-1.5">
                        {locale === 'ar' ? 'أسئلة قريبة' : 'Related questions'}
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {msg.related.map((q, i) => (
                          <button
                            type="button"
                            key={`${q}-${i}`}
                            onClick={() => sendMessage(q)}
                            disabled={isTyping}
                            className="group inline-flex items-center justify-between gap-2 text-start text-xs px-3 py-2 bg-white border border-cream-300 rounded-xl hover:border-kcc-rose-dark/50 hover:bg-blush-50 transition-all disabled:opacity-50"
                          >
                            <span className="text-ink-700 group-hover:text-kcc-rose-dark transition-colors leading-snug">{q}</span>
                            <span className="text-cream-700 group-hover:text-kcc-rose-dark transition-colors">→</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-cream-300 text-cream-800 flex items-center justify-center mt-1">
                    <User size={16} />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {showInitialSuggestions && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mt-6"
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} className="text-kcc-beige-dark" />
                <p className="text-xs text-cream-700 font-medium uppercase tracking-wider">
                  {t('ai.suggestedTitle')}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-2">
                {currentSuggestions.map((q, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="flex items-start gap-2.5 px-4 py-3 text-sm text-cream-800 bg-cream-100 border border-cream-300 rounded-xl hover:border-kcc-green/30 hover:text-ink-700 hover:bg-blush-50 transition-all text-start group"
                  >
                    <MessageCircle size={14} className="shrink-0 mt-0.5 text-cream-600 group-hover:text-kcc-green transition-colors" />
                    <span>{q}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {isTyping && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-kcc-green/15 text-kcc-green flex items-center justify-center mt-1">
                <Bot size={16} />
              </div>
              <div className="px-4 py-3 bg-white border border-cream-300 rounded-2xl rounded-bl-md">
                <div className="flex items-center gap-2 text-sm text-cream-700">
                  <Loader2 size={14} className="animate-spin" />
                  {t('ai.thinking')}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="border-t border-cream-300 bg-white/95">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {currentPinned.map((q, i) => (
              <button
                type="button"
                key={i}
                onClick={() => sendMessage(q)}
                disabled={isTyping}
                className="px-3 py-1.5 text-xs text-cream-700 bg-white border border-cream-300 rounded-full hover:border-kcc-green/40 hover:text-kcc-green transition-all disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('ai.placeholder')}
              disabled={isTyping}
              className="flex-1 px-4 py-3 bg-white border border-cream-300 rounded-xl text-ink-700 placeholder:text-cream-700 focus:outline-none focus:border-kcc-rose-dark transition-colors disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isTyping}
              className="px-4 py-3 bg-kcc-green hover:bg-kcc-green-light text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </div>

          <p className="text-[10px] text-cream-600 text-center mt-2">
            {locale === 'ar'
              ? 'مساعد KCC الذكي يقدم معلومات عامة. للطلبات المحددة، يرجى التواصل مع فريقنا.'
              : 'KCC AI Assistant provides general information. For specific orders, please contact our team.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function getLocalFallback(locale: string): string {
  return locale === 'ar'
    ? 'شكراً لسؤالك! يمكنني مساعدتك بمعلومات عن خدمات KCC، طلب العينات، الشهادات، والمزيد. حاول طرح سؤال محدد أو استخدم الأسئلة السريعة أدناه.'
    : 'Thank you for your question! I can help you with information about KCC services, sample requests, certifications, and more. Try asking a specific question or use the quick questions below.';
}
