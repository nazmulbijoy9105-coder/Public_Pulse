import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  Lock, 
  Scale, 
  EyeOff, 
  FileText, 
  Info,
  CheckCircle2
} from 'lucide-react';

export const Legal: React.FC = () => {
  return (
    <div className="space-y-8 pb-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-10 rounded-[3rem] shadow-xl border border-gray-100"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-bd-green/10 text-bd-green rounded-[1.5rem] flex items-center justify-center">
            <Scale size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-display font-black text-gray-900 tracking-tight">Legal Framework</h2>
            <p className="text-sm text-gray-500 font-medium uppercase tracking-widest">Digital Public Opinion Observatory</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
            <div className="flex items-center gap-3 mb-4 text-bd-green">
              <ShieldCheck size={24} />
              <h4 className="font-black text-sm uppercase tracking-widest">Positioning</h4>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed font-medium">
              This platform is <span className="text-bd-red font-black">NOT</span> an election system. It is a <span className="text-bd-green font-black">Digital Public Opinion Observatory</span> designed for continuous democratic feedback and sentiment analysis.
            </p>
          </div>

          <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
            <div className="flex items-center gap-3 mb-4 text-bd-red">
              <Lock size={24} />
              <h4 className="font-black text-sm uppercase tracking-widest">Compliance</h4>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed font-medium">
              Fully compliant with data protection standards. We prioritize <span className="font-black text-gray-900">Data Anonymization</span> and maintain a strict <span className="font-black text-gray-900">No Political Bias</span> policy.
            </p>
          </div>
        </div>

        <div className="space-y-10">
          <section>
            <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
              <FileText size={24} className="text-bd-green" />
              Privacy Policy
            </h3>
            <div className="space-y-4 text-sm text-gray-600 font-medium leading-relaxed">
              <p>
                1. <span className="text-gray-900 font-black">Data Collection:</span> We collect minimal data required for verification (Phone/NID hash). Original NID numbers are never stored on our servers.
              </p>
              <p>
                2. <span className="text-gray-900 font-black">Anonymization:</span> All votes are cryptographically linked to a trust score, not a personal identity. Aggregate results are public, but individual votes are private.
              </p>
              <p>
                3. <span className="text-gray-900 font-black">Usage:</span> Data is used solely for generating national sentiment reports and policy feedback for public interest.
              </p>
            </div>
          </section>

          <section className="pt-10 border-t border-gray-100">
            <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
              <EyeOff size={24} className="text-bd-red" />
              Anti-Spam & Integrity
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                "Mandatory Phone OTP Verification",
                "NID-Based Sybil Protection",
                "Rate Limiting & Spam Prevention",
                "Weighted Trust Scoring System",
                "Transparent AI Governance",
                "Anonymized Regional Heatmaps"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <CheckCircle2 size={18} className="text-bd-green shrink-0" />
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{item}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </motion.div>

      <div className="bg-bd-red/5 p-8 rounded-[2.5rem] border border-bd-red/10 flex items-start gap-4">
        <Info size={24} className="text-bd-red shrink-0 mt-1" />
        <p className="text-xs text-bd-red/80 font-bold leading-relaxed uppercase tracking-widest">
          Disclaimer: The Digital Public Opinion Observatory is an independent research initiative. Results are indicative of verified citizen sentiment and do not constitute official government policy.
        </p>
      </div>
    </div>
  );
};
