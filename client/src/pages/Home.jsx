import React from 'react';
import { 
  Calendar, CheckCircle, Video, Lock, Heart, 
  Stethoscope, Baby, Bone, Brain, Eye, Star 
} from 'lucide-react';

const Home = () => {
  return (
    <div className="bg-white font-sans">
      
      {/* --- HERO SECTION --- */}
      <div className="px-6 md:px-12 lg:px-20">
        <div className="bg-[#5f6FFF] rounded-2xl flex flex-col md:flex-row items-center mt-10 px-10 md:px-16 lg:px-24 pt-10 md:pt-0 relative overflow-hidden">
          
          {/* Left Side: Content */}
          <div className="md:w-1/2 flex flex-col items-start justify-center gap-6 py-10 md:py-[10vw]">
            <h1 className="text-white text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Book Appointment <br /> With Trusted Doctors
            </h1>
            
            <div className="flex flex-col md:flex-row items-center gap-3 text-white font-light text-sm">
              <div className="flex -space-x-3">
                <img className="w-10 h-10 rounded-full border-2 border-white shadow-sm" src="https://media.istockphoto.com/id/1356562845/photo/happy-doctor-leading-a-team-of-healthcare-workers-at-the-hospital.jpg?s=612x612&w=0&k=20&c=IMAkynSYgxfvO0Mo8s0yOj8245nelXyt4Z0IrgEZnik=" alt="doc1" />
                <img className="w-10 h-10 rounded-full border-2 border-white shadow-sm" src="https://i.pravatar.cc/150?u=a2" alt="doc2" />
                <img className="w-10 h-10 rounded-full border-2 border-white shadow-sm" src="https://i.pravatar.cc/150?u=a3" alt="doc3" />
              </div>
              <p className="text-center md:text-left opacity-90 leading-relaxed">
                Simply browse through our extensive list of trusted doctors, <br className="hidden sm:block" /> schedule your appointment hassle-free.
              </p>
            </div>

            <button className="flex items-center gap-2 bg-white px-8 py-4 rounded-full text-gray-600 text-sm hover:scale-105 transition-all duration-300 shadow-lg font-medium">
              Book appointment <span className="text-lg">→</span>
            </button>
          </div>

          {/* Right Side: Image Area */}
          <div className="md:w-1/2 relative">
            <img 
              src="https://media.istockphoto.com/id/1356562845/photo/happy-doctor-leading-a-team-of-healthcare-workers-at-the-hospital.jpg?s=612x612&w=0&k=20&c=IMAkynSYgxfvO0Mo8s0yOj8245nelXyt4Z0IrgEZnik=" 
              alt="Doctors" 
              className="w-full "
            />
          </div>
        </div>
      </div>

      {/* --- WHY CHOOSE US --- */}
      <section className="py-20 px-6 max-w-7xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-2">Why Choose MediCare?</h2>
        <p className="text-gray-500 mb-12">Experience healthcare like never before</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
          <FeatureCard icon={<Calendar className="text-blue-500" />} title="Easy Booking" color="bg-blue-50" />
          <FeatureCard icon={<CheckCircle className="text-emerald-500" />} title="Certified Doctors" color="bg-emerald-50" />
          <FeatureCard icon={<Video className="text-purple-500" />} title="Video Consultation" color="bg-purple-50" />
          <FeatureCard icon={<Lock className="text-amber-500" />} title="Secure & Private" color="bg-amber-50" />
        </div>
      </section>

      {/* --- POPULAR SPECIALITIES --- */}
      <section className="py-20 bg-gray-50 px-6 text-center">
        <h2 className="text-3xl font-bold mb-2">Popular Specialities</h2>
        <p className="text-gray-500 mb-12">Find the right specialist for your needs</p>
        
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-10">
          <SpecialityCard icon={<Heart className="text-red-500" />} name="Cardiology" />
          <SpecialityCard icon={<Stethoscope className="text-pink-500" />} name="Dermatology" />
          <SpecialityCard icon={<Baby className="text-blue-500" />} name="Pediatrics" />
          <SpecialityCard icon={<Bone className="text-green-500" />} name="Orthopedics" />
          <SpecialityCard icon={<Brain className="text-purple-500" />} name="Neurology" />
          <SpecialityCard icon={<Eye className="text-yellow-600" />} name="Ophthalmology" />
        </div>
        <button className="text-[#5f6FFF] font-semibold flex items-center gap-2 mx-auto hover:underline">
          View All Specialities <span>→</span>
        </button>
      </section>

      {/* --- MEET OUR TOP DOCTORS --- */}
      <section className="py-20 px-6 max-w-7xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-2">Meet Our Top Doctors</h2>
        <p className="text-gray-500 mb-12">Experienced professionals ready to help you</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <DoctorCard name="Dr. Michael Chen" type="Cardiologist" img="https://i.pravatar.cc/150?u=d1" />
          <DoctorCard name="Dr. Sarah Williams" type="Dermatologist" img="https://i.pravatar.cc/150?u=d2" />
          <DoctorCard name="Dr. James Wilson" type="Neurologist" img="https://i.pravatar.cc/150?u=d3" />
          <DoctorCard name="Dr. Emily Rodriguez" type="Pediatrician" img="https://i.pravatar.cc/150?u=d4" />
        </div>
      </section>

      {/* --- TESTIMONIALS --- */}
      <section className="py-20 bg-[#5f6FFF] px-6 text-center text-white">
        <h2 className="text-3xl font-bold mb-2">What Our Patients Say</h2>
        <p className="text-blue-100 mb-12">Real stories from real people</p>
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <TestimonialCard name="John Anderson" text="MediCare made booking my appointment so easy. Dr. Chen was professional and really listened." />
          <TestimonialCard name="Maria Garcia" text="The video consultation feature is a game-changer! I could consult with Dr. Williams right from home." />
          <TestimonialCard name="Kevin Smith" text="Finding a pediatrician for my son was a breeze. Dr. Rodriguez was wonderful with him!" />
        </div>
      </section>

    </div>
  );
};

// --- HELPER COMPONENTS (Place these in the same file or separate ones) ---

const FeatureCard = ({ icon, title, color }) => (
  <div className="p-8 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
    <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center mb-6`}>
      {React.cloneElement(icon, { size: 24 })}
    </div>
    <h3 className="font-bold text-lg mb-2">{title}</h3>
    <p className="text-gray-500 text-sm leading-relaxed">Book appointments in just a few clicks, anytime, anywhere.</p>
  </div>
);

const SpecialityCard = ({ icon, name }) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col items-center gap-4 hover:border-[#5f6FFF] transition-all cursor-pointer group">
    <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center group-hover:bg-blue-50 transition-colors">
      {React.cloneElement(icon, { size: 28 })}
    </div>
    <span className="font-bold text-sm text-gray-700">{name}</span>
  </div>
);

const DoctorCard = ({ name, type, img }) => (
  <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg transition-all text-left group">
    <div className="h-64 bg-gray-100 overflow-hidden">
        <img src={img} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
    </div>
    <div className="p-6">
      <h3 className="font-bold text-lg">{name}</h3>
      <p className="text-[#5f6FFF] text-xs font-semibold uppercase tracking-wider mb-2">{type}</p>
      <div className="flex gap-1 text-amber-400 mb-2">
        {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
        <span className="text-gray-400 text-xs ml-1">(154)</span>
      </div>
      <p className="text-gray-400 text-xs mb-6 italic">10+ years experience</p>
      <button className="w-full bg-[#5f6FFF] text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-md shadow-blue-200">
        Book Appointment
      </button>
    </div>
  </div>
);

const TestimonialCard = ({ name, text }) => (
  <div className="bg-white p-8 rounded-3xl text-gray-900 shadow-xl">
    <div className="flex gap-1 text-amber-400 mb-4">
      {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
    </div>
    <p className="text-gray-600 text-sm leading-relaxed mb-8 italic">"{text}"</p>
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-[#5f6FFF]">
        {name.charAt(0)}
      </div>
      <div>
        <h4 className="font-bold text-sm">{name}</h4>
        <p className="text-gray-400 text-xs uppercase">Patient</p>
      </div>
    </div>
  </div>
);

export default Home;