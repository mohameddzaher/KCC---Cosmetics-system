'use client';

import { motion } from 'framer-motion';
import {
  ClipboardCheck,
  Search,
  BadgeCheck,
  FileSignature,
  Wallet,
  Factory,
  Truck,
  PackageCheck,
  CheckCircle2,
  Check,
  Radio,
} from 'lucide-react';

const orderStages = [
  { key: 'Submitted', label: 'Submitted', icon: ClipboardCheck, color: 'text-blue-400', ring: 'ring-blue-400/25', line: 'bg-blue-400/50', message: 'Your order was received and queued for processing.' },
  { key: 'Under Review', label: 'Under Review', icon: Search, color: 'text-amber-400', ring: 'ring-amber-400/25', line: 'bg-amber-400/50', message: 'Our specialists are reviewing your requirements.' },
  { key: 'Approved', label: 'Approved', icon: BadgeCheck, color: 'text-green-400', ring: 'ring-green-400/25', line: 'bg-green-400/50', message: 'The request has been approved by the technical team.' },
  { key: 'Quotation Sent', label: 'Quotation Sent', icon: FileSignature, color: 'text-orange-400', ring: 'ring-orange-400/25', line: 'bg-orange-400/50', message: 'A quotation was prepared and shared for your confirmation.' },
  { key: 'Awaiting Payment', label: 'Awaiting Payment', icon: Wallet, color: 'text-yellow-400', ring: 'ring-yellow-400/25', line: 'bg-yellow-400/50', message: 'We are waiting for payment confirmation to proceed.' },
  { key: 'In Production', label: 'In Production', icon: Factory, color: 'text-purple-400', ring: 'ring-purple-400/25', line: 'bg-purple-400/50', message: 'Your order is currently in manufacturing.' },
  { key: 'Shipped', label: 'Shipped', icon: Truck, color: 'text-cyan-400', ring: 'ring-cyan-400/25', line: 'bg-cyan-400/50', message: 'The order left our facility and is in transit.' },
  { key: 'Delivered', label: 'Delivered', icon: PackageCheck, color: 'text-kcc-green', ring: 'ring-kcc-green/25', line: 'bg-kcc-green/50', message: 'Order delivered successfully.' },
] as const;

export default function OrderProgressTracker({
  status,
  updatedAt,
}: {
  status: string;
  updatedAt?: string;
}) {
  const currentIndex = orderStages.findIndex((stage) => stage.key === status);
  const currentStage = orderStages[currentIndex] || null;
  const isClosed = status === 'Closed';
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const progressPercent = Math.round(((safeIndex + 1) / orderStages.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="bg-gradient-to-br from-dark-900/80 via-dark-900/70 to-dark-950 border border-dark-800 rounded-3xl p-4 sm:p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)] overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-5">
        <div>
          <h3 className="text-sm font-semibold text-dark-100 uppercase tracking-[0.18em]">Order Status / Delivery Progress</h3>
          <p className="text-xs text-dark-500 mt-1">
            {updatedAt ? `Last sync: ${new Date(updatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : 'Live sync enabled'}
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-kcc-green/30 bg-gradient-to-r from-kcc-green/15 to-kcc-beige/10 text-kcc-green text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-kcc-green animate-pulse" />
          Auto-updating
        </div>
      </div>

      {!isClosed && (
        <div className="mb-5 sm:mb-6">
          <div className="flex items-center justify-between text-xs text-dark-500 mb-2">
            <span className="uppercase tracking-[0.14em]">Completion</span>
            <span className="text-dark-300 font-medium">{progressPercent}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-dark-800 overflow-hidden border border-dark-700/80">
            <motion.div
              initial={false}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-kcc-green via-kcc-green-light to-kcc-beige"
            />
          </div>
        </div>
      )}

      {isClosed ? (
        <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4">
          <div className="inline-flex items-center gap-2 text-dark-300 mb-1">
            <CheckCircle2 size={16} />
            <span className="font-medium">Order Closed</span>
          </div>
          <p className="text-sm text-dark-400">This order lifecycle has been finalized and closed.</p>
        </div>
      ) : (
        <>
          {/* Desktop: fixed horizontal milestone layout */}
          <div className="hidden lg:block">
            <div className="relative">
              <div className="absolute top-5 left-6 right-6 h-1 rounded-full bg-dark-800 border border-dark-700/80" />
              <motion.div
                className="absolute top-5 left-6 h-1 rounded-full bg-gradient-to-r from-kcc-green via-kcc-green-light to-kcc-beige"
                initial={false}
                animate={{ width: `calc((100% - 3rem) * ${progressPercent / 100})` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
              <ol className="relative grid grid-cols-8 gap-2">
              {orderStages.map((stage, i) => {
                const Icon = stage.icon;
                const isDone = i < safeIndex;
                const isCurrent = i === safeIndex;
                const isUpcoming = i > safeIndex;

                return (
                  <li key={stage.key} className="relative min-w-0">
                    <div className="flex justify-center mb-3">
                      <motion.div
                        initial={false}
                        animate={isCurrent ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                        transition={{ duration: 1.6, repeat: isCurrent ? Infinity : 0, ease: 'easeInOut' }}
                        className={`relative z-10 w-10 h-10 rounded-full border flex items-center justify-center shrink-0 ${
                          isCurrent
                            ? `border-kcc-green/60 bg-dark-800 shadow-lg shadow-kcc-green/20`
                            : isDone
                              ? 'border-kcc-green/50 bg-kcc-green/10'
                              : 'border-dark-700 bg-dark-900'
                        }`}
                      >
                        {isCurrent ? (
                          <Radio size={15} className={stage.color} />
                        ) : isDone ? (
                          <Check size={16} className="text-kcc-green" />
                        ) : (
                          <Icon size={15} className="text-dark-500" />
                        )}
                      </motion.div>
                    </div>

                    <div className={`rounded-xl border p-3 h-[116px] transition-all ${
                      isCurrent
                        ? `border-dark-600 bg-dark-800/90 shadow-lg ${stage.ring}`
                        : isDone
                          ? 'border-dark-700 bg-dark-800/50'
                          : 'border-dark-800 bg-dark-900/40'
                    }`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 border ${
                        isCurrent
                          ? `bg-dark-700 border-dark-600 ${stage.color}`
                          : isDone
                            ? 'bg-kcc-green/10 text-kcc-green border-kcc-green/30'
                            : 'bg-dark-800 text-dark-500 border-dark-700'
                      }`}>
                        <Icon size={14} />
                      </div>
                      <p className={`text-xs font-semibold leading-tight line-clamp-2 ${isUpcoming ? 'text-dark-500' : 'text-dark-200'}`}>{stage.label}</p>
                      <p className={`text-[10px] mt-1.5 leading-snug ${isUpcoming ? 'text-dark-600' : 'text-dark-500'}`}>
                        {isCurrent ? 'In progress now' : isDone ? 'Completed' : 'Upcoming'}
                      </p>
                    </div>
                  </li>
                );
              })}
              </ol>
            </div>
          </div>

          {/* Tablet: 2-column cards for readability */}
          <div className="hidden sm:grid lg:hidden grid-cols-2 gap-2.5">
            {orderStages.map((stage, i) => {
              const Icon = stage.icon;
              const isDone = i < safeIndex;
              const isCurrent = i === safeIndex;
              return (
                <div
                  key={stage.key}
                  className={`rounded-xl border px-3 py-3 flex items-center gap-3 min-h-[72px] ${
                    isCurrent
                      ? `border-dark-600 bg-dark-800/90 ${stage.ring}`
                      : isDone
                        ? 'border-dark-700 bg-dark-800/50'
                        : 'border-dark-800 bg-dark-900/50'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 ${
                    isCurrent
                      ? `bg-dark-700 border-dark-600 ${stage.color}`
                      : isDone
                        ? 'bg-kcc-green/10 text-kcc-green border-kcc-green/30'
                        : 'bg-dark-800 text-dark-500 border-dark-700'
                  }`}>
                    {isDone && !isCurrent ? <Check size={15} /> : <Icon size={15} />}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium leading-tight ${isCurrent || isDone ? 'text-dark-200' : 'text-dark-500'}`}>{stage.label}</p>
                    <p className={`text-[11px] mt-0.5 ${isCurrent ? stage.color : 'text-dark-600'}`}>{isCurrent ? 'Current stage' : isDone ? 'Done' : 'Pending'}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile: vertical timeline for no overflow/wrap glitches */}
          <div className="sm:hidden space-y-2.5">
            {orderStages.map((stage, i) => {
              const Icon = stage.icon;
              const isDone = i < safeIndex;
              const isCurrent = i === safeIndex;
              return (
                <div
                  key={stage.key}
                  className={`rounded-xl border px-3 py-2.5 flex items-center gap-3 transition-all ${
                    isCurrent
                      ? `border-dark-600 bg-dark-800/90 ${stage.ring}`
                      : isDone
                        ? 'border-dark-700 bg-dark-800/50'
                        : 'border-dark-800 bg-dark-900/50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${
                    isCurrent
                      ? `bg-dark-700 border-dark-600 ${stage.color}`
                      : isDone
                        ? 'bg-kcc-green/10 text-kcc-green border-kcc-green/30'
                        : 'bg-dark-800 text-dark-500 border-dark-700'
                  }`}>
                    {isDone && !isCurrent ? <Check size={15} /> : <Icon size={15} />}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isCurrent || isDone ? 'text-dark-200' : 'text-dark-500'}`}>{stage.label}</p>
                    <p className={`text-[11px] ${isCurrent ? stage.color : 'text-dark-600'}`}>{isCurrent ? 'Current stage' : isDone ? 'Done' : 'Pending'}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 rounded-xl border border-dark-700/80 bg-dark-800/50 p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-dark-500 mb-1">Current Status</p>
            <p className={`text-base font-semibold ${currentStage?.color || 'text-dark-200'}`}>{currentStage?.label || status}</p>
            {currentStage?.message && <p className="text-sm text-dark-400 mt-1 leading-relaxed">{currentStage.message}</p>}
          </div>
        </>
      )}
    </motion.div>
  );
}
