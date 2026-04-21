import React from 'react';
import { 
  Users, ShieldCheck, Zap, Globe, Heart, 
  Award, MessageSquare, ArrowRight, Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';

const About = () => {
  return (
    <div className="bg-[#edf2f7] font-sans text-slate-900 min-h-screen">
      
      {/* --- HERO SECTION --- */}
      <div className="px-6 md:px-12 lg:px-20 pt-10">
        <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-2xl shadow-slate-300/50 flex flex-col items-center overflow-hidden relative p-12 md:p-24 text-center">
          
          {/* Mint Decorative Flare */}
          <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#f0fff4] rounded-full blur-3xl opacity-80 -z-0"></div>

          <div className="z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-[#e6fffa] px-4 py-2 rounded-full border border-[#b2f5ea] mb-8">
              <Activity size={16} className="text-[#2c7a7b]" />
              <span className="text-[#2c7a7b] text-xs font-black uppercase tracking-widest">Our Story</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-black leading-[1.1] tracking-tighter text-slate-900 mb-8">
              Revolutionizing <span className="text-sky-400">Healthcare</span> <br /> for every Nepali.
            </h1>
            
            <p className="text-slate-500 text-lg md:text-xl leading-relaxed">
              MediHub Nepal started with a simple idea: health services should be as accessible as a phone call. 
              We are building the digital infrastructure to connect patients with top-tier specialists instantly.
            </p>
          </div>
        </div>
      </div>

      {/* --- CORE VALUES (Bento Grid Style) --- */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">What Drives Us</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Accessibility */}
          <div className="md:col-span-2 bg-white p-10 rounded-[2.5rem] border border-slate-200/60 shadow-sm hover:shadow-xl transition-all group">
            <div className="bg-sky-400 w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform">
              <Globe size={28} />
            </div>
            <h3 className="text-2xl font-black mb-4">Nationwide Accessibility</h3>
            <p className="text-slate-500 leading-relaxed text-lg">
              Distance shouldn't be a barrier to quality care. Whether you are in the heart of Kathmandu or a 
              remote village, MediHub Nepal aims to bring the country's best doctors to your fingertips.
            </p>
          </div>

          {/* Trust */}
          <div className="bg-[#38b2ac] p-10 rounded-[2.5rem] text-white flex flex-col justify-between hover:shadow-xl transition-all">
            <ShieldCheck size={48} className="mb-8" />
            <div>
              <h3 className="text-2xl font-black mb-2">100% Verified</h3>
              <p className="opacity-90">Every doctor is vetted with their official NMC credentials.</p>
            </div>
          </div>

          {/* Speed */}
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200/60 shadow-sm hover:shadow-xl transition-all group">
            <div className="bg-amber-400 w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-6">
              <Zap size={28} />
            </div>
            <h3 className="text-2xl font-black mb-2">Zero Wait Time</h3>
            <p className="text-slate-500">Real-time scheduling means no more long queues or busy phone lines.</p>
          </div>

          {/* Care */}
          <div className="md:col-span-2 bg-[#f0fff4] p-10 rounded-[2.5rem] border border-[#b2f5ea] flex flex-col md:flex-row items-center gap-8 hover:shadow-xl transition-all">
            <div className="bg-white p-6 rounded-3xl shadow-sm">
                <Heart size={40} className="text-red-400 fill-red-400" />
            </div>
            <div>
                <h3 className="text-2xl font-black mb-2 text-[#2c7a7b]">Patient-First Approach</h3>
                <p className="text-[#2c7a7b] opacity-80 text-lg">
                    We design our features—from payment integration to UI—with your comfort and privacy as the top priority.
                </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- STATS SECTION --- */}
      <section className="pb-32 px-6">
        <div className="max-w-7xl mx-auto bg-slate-900 rounded-[3rem] p-12 md:p-20 flex flex-wrap justify-center gap-12 md:gap-24 text-center">
          <StatBox number="500+" label="Specialists" />
          <StatBox number="10k+" label="Appointments" />
          <StatBox number="50+" label="Clinics" />
          <StatBox number="4.9" label="User Rating" />
        </div>
      </section>

      {/* --- CTA --- */}
      <section className="pb-32 px-6 text-center">
        <h2 className="text-3xl font-black mb-8">Ready to experience better care?</h2>
        <Link to="/all-doctors" className="inline-flex items-center gap-3 bg-sky-400 px-10 py-5 rounded-2xl text-white hover:bg-sky-500 transition-all duration-300 shadow-xl shadow-sky-200 group">
          <span className="font-black tracking-tight text-lg">Find Your Doctor</span>
          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </section>
    </div>
  );
};

// Sub-component for Stats
const StatBox = ({ number, label }) => (
  <div className="flex flex-col gap-2">
    <span className="text-sky-400 text-4xl md:text-5xl font-black tracking-tighter">{number}</span>
    <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">{label}</span>
  </div>
);

export default About;