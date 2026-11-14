import { useState } from 'react';
import { ChevronDown, Phone, ShieldAlert } from 'lucide-react';
import { EMERGENCY_CONTACTS, HELP_FAQS } from '../types/campus';

export function HelpView() {
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          24/7 Campus Support & Guidance
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-0.5">
          Help & Emergency Numbers
        </h1>
      </div>

      {/* Emergency Numbers */}
      <section className="space-y-3" aria-labelledby="emergency-heading">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" aria-hidden="true" />
          <h2
            id="emergency-heading"
            className="text-base font-semibold text-slate-900 dark:text-slate-100"
          >
            Emergency & Urgent Hotlines
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {EMERGENCY_CONTACTS.map((contact) => (
            <div
              key={contact.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span
                    className={`font-semibold ${
                      contact.urgent
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    {contact.availability}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {contact.name}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {contact.scope}
                </p>
              </div>

              <a
                href={`tel:${contact.tel}`}
                className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-mono font-semibold inline-flex items-center justify-center gap-2 transition-colors ${
                  contact.urgent
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white'
                }`}
              >
                <Phone className="w-4 h-4" aria-hidden="true" />
                <span>{contact.number}</span>
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* FAQs */}
      <section className="space-y-3" aria-labelledby="faq-heading">
        <h2
          id="faq-heading"
          className="text-base font-semibold text-slate-900 dark:text-slate-100"
        >
          Frequently Asked Questions
        </h2>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
          {HELP_FAQS.map((item, idx) => {
            const isOpen = openFaqIdx === idx;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                  className="w-full min-h-[54px] px-4 sm:px-5 py-3.5 text-left flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
