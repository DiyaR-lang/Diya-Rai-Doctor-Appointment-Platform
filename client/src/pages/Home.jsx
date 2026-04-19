import React from 'react';
import { 
  Calendar, CheckCircle, Video, Lock, Heart, 
  Stethoscope, Baby, Bone, Brain, Eye, Star, ArrowRight 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = () => {
  // Plug in your backend data here
  const doctorsFromBackend = [
    { id: 1, name: "Dr. Michael Chen", type: "Cardiologist", rating: "4.9" },
    { id: 2, name: "Dr. Sarah Williams", type: "Dermatologist", rating: "5.0" },
    { id: 3, name: "Dr. James Wilson", type: "Neurologist", rating: "4.8" },
    { id: 4, name: "Dr. Emily Rodriguez", type: "Pediatrician", rating: "4.9" },
  ];

  return (
    /* Changed bg-slate-100 for a slightly darker, more professional base */
    <div className="bg-[#edf2f7] font-sans text-slate-900 min-h-screen">
      
      {/* --- HERO SECTION --- */}
      <div className="px-6 md:px-12 lg:px-20 pt-10">
        <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-2xl shadow-slate-300/50 flex flex-col md:flex-row items-center overflow-hidden min-h-[600px] relative">
          
          {/* Light Mint Decorative Flare */}
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#f0fff4] rounded-full blur-3xl opacity-80 -z-0"></div>

          {/* Left Side: Content */}
          <div className="md:w-1/2 flex flex-col items-start justify-center gap-8 p-10 md:p-16 lg:p-24 z-10">
            <div className="inline-flex items-center gap-2 bg-[#e6fffa] px-4 py-2 rounded-full border border-[#b2f5ea]">
              <span className="text-[#2c7a7b] text-xs font-black uppercase tracking-widest">Healthcare in Nepal</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-7xl font-black leading-[1.1] tracking-tighter text-slate-900">
              Your Health, <br /> 
              <span className="text-sky-400">Simplified.</span>
            </h1>
            
            <p className="text-slate-500 text-lg md:text-xl leading-relaxed max-w-md">
              The most trusted medical network in the country. Connect with specialists at <span className="font-bold text-slate-800">MediHub Nepal</span>.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link to="/all-doctors" className="flex items-center gap-3 bg-sky-400 px-10 py-5 rounded-2xl text-white hover:bg-sky-500 transition-all duration-300 shadow-xl shadow-sky-200 group">
                <span className="font-black tracking-tight">Book Now</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Right Side: Image */}
          <div className="md:w-1/2 h-full bg-[#f0fff4]/50 flex items-end justify-center relative overflow-hidden">
            <img 
              src="https://media.istockphoto.com/id/1356562845/photo/happy-doctor-leading-a-team-of-healthcare-workers-at-the-hospital.jpg?s=612x612&w=0&k=20&c=IMAkynSYgxfvO0Mo8s0yOj8245nelXyt4Z0IrgEZnik=" 
              alt="Healthcare Team" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* --- WHY CHOOSE US --- */}
      <section className="py-32 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black tracking-tight mb-4 text-slate-900">Why <span className="text-[#38b2ac]">MediHub Nepal?</span></h2>
          <p className="text-slate-500 text-lg font-medium">Elevating the standard of care.</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard icon={<Calendar />} title="Fast Booking" desc="Connect with your doctor in under 60 seconds." color="bg-sky-400" />
          <FeatureCard icon={<CheckCircle />} title="Certified" desc="100% verified medical professionals only." color="bg-[#38b2ac]" />
          <FeatureCard icon={<Video />} title="Remote Care" desc="Consult via high-quality video calling." color="bg-sky-400" />
          <FeatureCard icon={<Lock />} title="Privacy" desc="Your data is encrypted and secure with us." color="bg-[#38b2ac]" />
        </div>
      </section>

      {/* --- TOP DOCTORS --- */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center md:items-end mb-16 gap-4">
            <div className="text-center md:text-left">
              <h2 className="text-4xl font-black tracking-tight mb-2 text-slate-900">Top Rated Specialists</h2>
              <p className="text-slate-500 font-medium">Expert care from our highest-rated professionals.</p>
            </div>
            <Link to="/all-doctors" className="text-sky-500 font-black hover:text-sky-600 transition-colors bg-white px-6 py-3 rounded-xl shadow-sm border border-slate-200">
              View All Doctors
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {doctorsFromBackend.map((doc) => (
              <DoctorCard 
                key={doc.id}
                name={doc.name} 
                type={doc.type} 
                rating={doc.rating} 
              />
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};

// --- REFINED SUB-COMPONENTS ---

const FeatureCard = ({ icon, title, desc, color }) => (
  <div className="group p-10 rounded-[2.5rem] bg-white border border-slate-200/60 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500">
    <div className={`w-14 h-14 ${color} text-white rounded-2xl flex items-center justify-center mb-8 shadow-lg transition-transform group-hover:rotate-3`}>
      {React.cloneElement(icon, { size: 28 })}
    </div>
    <h3 className="font-black text-xl mb-3 text-slate-800">{title}</h3>
    <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
  </div>
);

const DoctorCard = ({ name, type, rating }) => (
  <div className="group bg-white rounded-[2.5rem] border border-slate-200/60 overflow-hidden hover:shadow-2xl transition-all duration-500">
    <div className="h-64 bg-slate-100 relative">
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1 z-10 shadow-sm border border-slate-100">
           <Star size={14} className="text-amber-400 fill-amber-400" />
           <span className="text-xs font-black text-slate-900">{rating}</span>
        </div>
        <img src={`https://i.pravatar.cc/300?u=${name}`} alt={name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
    </div>
    <div className="p-8">
      <p className="text-[#38b2ac] text-[10px] font-black uppercase tracking-widest mb-1">{type}</p>
      <h3 className="font-black text-lg mb-6 text-slate-900">{name}</h3>
      <Link to="/all-doctors" className="block w-full text-center bg-sky-50 text-sky-500 py-4 rounded-2xl font-black text-sm hover:bg-sky-400 hover:text-white transition-all shadow-sm shadow-sky-100">
        Book Visit
      </Link>
    </div>
  </div>
);

export default Home;