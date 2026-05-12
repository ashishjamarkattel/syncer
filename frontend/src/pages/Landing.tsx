import Navbar from '../components/landing/Navbar'
import Hero from '../components/landing/Hero'
import HowItWorks from '../components/landing/HowItWorks'
import FeaturesSection from '../components/landing/FeaturesSection'
import UseCasesSection from '../components/landing/UseCasesSection'
import Footer from '../components/landing/Footer'

function Landing() {
  return (
    <div className="min-h-screen relative bg-[#ffffeb]">
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808010_1px,transparent_1px),linear-gradient(to_bottom,#80808010_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="relative z-10">
        <Navbar />
        <Hero />
        <HowItWorks />
        <FeaturesSection />
        <UseCasesSection />
        <Footer />
      </div>
    </div>
  )
}

export default Landing
