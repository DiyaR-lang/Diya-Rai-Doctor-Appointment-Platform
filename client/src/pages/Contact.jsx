import React from 'react';
import { 
  Mail, Phone, MapPin, Send, 
  Clock, MessageCircle, Globe, Activity 
} from 'lucide-react';

const Contact = () => {
  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle your form submission logic here
    console.log("Message sent!");
  };

  return (
    <div className="bg-[#edf2f7] font-sans text-slate-900 min-h-screen">
      
      {/* --- HEADER SECTION --- */}
      <div className="px-6 md:px-12 lg:px-20 pt-10">
        <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-2xl shadow-slate-300/50 p-12 md:p-20 relative overflow-hidden">
          
          {/* Mint Decorative Flare */}
          <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-[#f0fff4] rounded-full blur-3xl opacity-80 -z-0"></div>

          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-[#e6fffa] px-4 py-2 rounded-full border border-[#b2f5ea] mb-6">
              <MessageCircle size={16} className="text-[#2c7a7b]" />
              <span className="text-[#2c7a7b] text-xs font-black uppercase tracking-widest">Get in Touch</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black leading-[1.1] tracking-tighter text-slate-900 mb-6">
              We’re here to <span className="text-sky-400">help you.</span>
            </h1>
            <p className="text-slate-500 text-lg leading-relaxed">
              Have questions about booking an appointment or joining our network as a doctor? 
              Our team is ready to assist you.
            </p>
          </div>
        </div>
      </div>

      {/* --- MAIN CONTENT: FORM & INFO --- */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Contact Form Container */}
          <div className="lg:col-span-2 bg-white p-8 md:p-12 rounded-[2.5rem] border border-slate-200/60 shadow-sm">
            <h3 className="text-2xl font-black mb-8 text-slate-800">Send us a Message</h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                  <input 
                    type="text" 
                    placeholder="John Doe" 
                    className="w-full bg-[#edf2f7] border-none rounded-2xl p-4 focus:ring-2 focus:ring-sky-400 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                  <input 
                    type="email" 
                    placeholder="john@example.com" 
                    className="w-full bg-[#edf2f7] border-none rounded-2xl p-4 focus:ring-2 focus:ring-sky-400 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Subject</label>
                <select className="w-full bg-[#edf2f7] border-none rounded-2xl p-4 focus:ring-2 focus:ring-sky-400 outline-none transition-all appearance-none text-slate-600">
                  <option>Appointment Inquiry</option>
                  <option>Technical Support</option>
                  <option>Doctor Partnership</option>
                  <option>Feedback</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Message</label>
                <textarea 
                  rows="5" 
                  placeholder="How can we help you?" 
                  className="w-full bg-[#edf2f7] border-none rounded-2xl p-4 focus:ring-2 focus:ring-sky-400 outline-none transition-all resize-none"
                ></textarea>
              </div>

              <button className="flex items-center justify-center gap-3 bg-sky-400 w-full md:w-auto px-12 py-5 rounded-2xl text-white font-black hover:bg-sky-500 transition-all shadow-lg shadow-sky-100 group">
                <span>Send Message</span>
                <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </button>
            </form>
          </div>

          {/* Side Info Cards (Bento Style) */}
          <div className="flex flex-col gap-6">
            
            {/* Phone Card */}
            <div className="bg-[#38b2ac] p-8 rounded-[2.5rem] text-white group hover:shadow-xl transition-all">
              <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                <Phone size={24} />
              </div>
              <h4 className="font-black text-xl mb-1">Call Us</h4>
              <p className="opacity-90 text-sm mb-4">Mon-Fri from 9am to 6pm.</p>
              <p className="font-black text-lg">+977-1-4XXXXXX</p>
            </div>

            {/* Email Card */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm hover:shadow-xl transition-all group">
              <div className="bg-sky-100 text-sky-500 w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:bg-sky-400 group-hover:text-white transition-colors">
                <Mail size={24} />
              </div>
              <h4 className="font-black text-xl text-slate-800 mb-1">Email Us</h4>
              <p className="text-slate-500 text-sm mb-4">We'll respond within 24 hours.</p>
              <p className="font-black text-sky-500">support@medihubnepal.com</p>
            </div>

            {/* Location Card */}
            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white hover:shadow-xl transition-all group">
              <div className="bg-slate-800 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                <MapPin size={24} className="text-sky-400" />
              </div>
              <h4 className="font-black text-xl mb-1">Office</h4>
              <p className="opacity-70 text-sm mb-4">Visit our headquarters.</p>
              <p className="font-bold text-sm">Kathmandu, Nepal</p>
            </div>

          </div>
        </div>
      </section>

      {/* --- FAQ / QUICK SUPPORT AREA --- */}
      <section className="pb-32 px-6 max-w-7xl mx-auto">
        <div className="bg-[#e6fffa] border border-[#b2f5ea] rounded-[2.5rem] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="flex items-center gap-6">
              <div className="bg-white p-4 rounded-2xl shadow-sm">
                <Clock size={32} className="text-[#38b2ac]" />
              </div>
              <div>
                <h4 className="font-black text-xl text-slate-800">Need an urgent appointment?</h4>
                <p className="text-[#2c7a7b]">Our support line is active for emergency scheduling.</p>
              </div>
           </div>
           <button className="bg-[#38b2ac] text-white px-8 py-4 rounded-2xl font-black hover:bg-[#2c7a7b] transition-all">
             Contact Support
           </button>
        </div>
      </section>

    </div>
  );
};

export default Contact;