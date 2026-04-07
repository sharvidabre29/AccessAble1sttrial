import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Users, HandHelping, DollarSign, ArrowRight, Heart,
  FileText, Search, CheckCircle, TrendingUp,
  Mail, Phone, Globe, Facebook, Twitter, Linkedin, Instagram,
  Building2, Shield, ClipboardList
} from "lucide-react";
import logoImg from "@/assets/logo.png";

const roles = [
  {
    tag: "REQUEST HELP",
    tagColor: "text-primary",
    icon: Users,
    iconBg: "bg-primary/10",
    title: "Individuals",
    description: "Individuals submit requests for assistance and connect with organizations and volunteers who can provide support.",
  },
  {
    tag: "GIVE TIME",
    tagColor: "text-success",
    icon: Heart,
    iconBg: "bg-success/10",
    title: "Volunteers",
    description: "Volunteers browse available opportunities and offer their time and skills to assist with tasks and initiatives.",
  },
  {
    tag: "COORDINATE",
    tagColor: "text-warning",
    icon: Building2,
    iconBg: "bg-warning/10",
    title: "Organizations",
    description: "Organizations create and manage service initiatives, coordinate volunteers, and oversee community support activities through the platform.",
  },
  {
    tag: "FUND CHANGE",
    tagColor: "text-info",
    icon: DollarSign,
    iconBg: "bg-info/10",
    title: "Donors",
    description: "Donors contribute funds toward verified needs and track the progress of the causes they support.",
  },
];

const features = [
  {
    icon: ClipboardList,
    iconBg: "bg-primary/10",
    title: "Request Support",
    description: "Submit detailed help requests with categories, urgency levels, and location for precise matching.",
  },
  {
    icon: Heart,
    iconBg: "bg-primary/10",
    title: "Volunteer Opportunities",
    description: "Browse open tasks, accept assignments, and track your volunteer hours and community impact.",
  },
  {
    icon: Building2,
    iconBg: "bg-primary/10",
    title: "NGO Coordination",
    description: "Organizations manage incoming requests, assign volunteers, and coordinate large-scale support operations.",
  },
  {
    icon: DollarSign,
    iconBg: "bg-primary/10",
    title: "Donation Support",
    description: "Fund specific requests with money or resources and see exactly how your donation creates impact.",
  },
];

const howItWorks = [
  {
    step: "01",
    icon: Search,
    title: "Post or Find a Request",
    description: "Individuals and organizations post help requests. Volunteers and donors browse what's available.",
  },
  {
    step: "02",
    icon: CheckCircle,
    title: "Connect & Coordinate",
    description: "Volunteers accept tasks. Donors fund requests. Organizations assign and manage resources efficiently.",
  },
  {
    step: "03",
    icon: TrendingUp,
    title: "Track Impact",
    description: "Follow every request from open to completed. See real statistics on community impact created.",
  },
];

const impactStats = [
  { icon: ClipboardList, value: "8,200+", label: "Help Requests Fulfilled" },
  { icon: Heart, value: "14,000+", label: "Active Volunteers" },
  { icon: Building2, value: "320+", label: "Partner Organizations" },
  { icon: DollarSign, value: "$2.4M+", label: "Donations Coordinated" },
];

const impactFeatures = [
  { icon: Globe, title: "Global Reach", description: "Operating in 50+ cities across 12 countries, growing every month." },
  { icon: Shield, title: "Verified & Safe", description: "All organizations and volunteers are verified to ensure trust and safety." },
  { icon: TrendingUp, title: "Proven Outcomes", description: "92% of requests are resolved within 72 hours of posting." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoImg} alt="AccessAble logo" className="w-8 h-8 rounded-lg" />
            <span className="font-heading font-bold text-lg text-primary">AccessAble</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Login</Link>
            </Button>
            <Button variant="hero" asChild>
              <Link to="/register">Sign Up</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="container max-w-4xl text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20 mb-6">
              <Heart className="w-3.5 h-3.5" /> Community Connect Platform
            </span>
          </motion.div>
          <motion.h1
            className="font-heading text-4xl md:text-6xl font-extrabold tracking-tight leading-tight mb-4"
            initial="hidden" animate="visible" variants={fadeUp} custom={1}
          >
            <span className="text-gradient">AccessAble</span>
          </motion.h1>
          <motion.h2
            className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2"
            initial="hidden" animate="visible" variants={fadeUp} custom={1.5}
          >
            Connecting Communities, Empowering Lives
          </motion.h2>
          <motion.p
            className="text-muted-foreground mb-2"
            initial="hidden" animate="visible" variants={fadeUp} custom={2}
          >
            With People Who Can Help
          </motion.p>
          <motion.p
            className="text-muted-foreground max-w-2xl mx-auto mb-10"
            initial="hidden" animate="visible" variants={fadeUp} custom={2.5}
          >
            AccessAble bridges the gap between those who need help and those willing to give it.
          </motion.p>
          <motion.div className="flex flex-col sm:flex-row gap-4 justify-center" initial="hidden" animate="visible" variants={fadeUp} custom={3}>
            <Button variant="hero" size="lg" className="rounded-full px-10" asChild>
              <Link to="/register">Sign Up Free</Link>
            </Button>
            <Button variant="outline" size="lg" className="rounded-full px-10" asChild>
              <Link to="/login">Login <ArrowRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Volunteer Image Section */}
      <section className="py-16 px-4">
        <div className="container max-w-5xl">
          <motion.div
            className="relative rounded-2xl overflow-hidden shadow-lg"
            initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          >
            <img
              src="https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=1200&h=500&fit=crop"
              alt="Volunteers making community impact"
              className="w-full h-[400px] object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <span className="inline-block px-3 py-1 rounded-full bg-background/20 backdrop-blur-sm text-primary-foreground text-sm font-medium border border-primary-foreground/20 mb-3">
                Real Community Impact
              </span>
              <p className="text-primary-foreground text-xl md:text-2xl font-heading font-semibold italic">
                Thousands of people connecting every day to support each other.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Who Is AccessAble For? */}
      <section className="py-20 px-4">
        <div className="container max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">Who Is AccessAble For?</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {roles.map((role, i) => (
              <motion.div
                key={role.title}
                className="bg-card rounded-xl p-6 border shadow-sm hover:shadow-md transition-shadow"
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              >
                <div className={`w-12 h-12 rounded-lg ${role.iconBg} flex items-center justify-center mb-4`}>
                  <role.icon className={`w-6 h-6 ${role.tagColor}`} />
                </div>
                <p className={`text-xs font-bold uppercase tracking-wider ${role.tagColor} mb-1`}>{role.tag}</p>
                <h3 className="font-heading font-bold text-lg text-card-foreground mb-2">{role.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{role.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Features */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">Platform Features</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">Everything you need to coordinate community support at scale.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="bg-card rounded-xl p-6 border shadow-sm hover:shadow-md transition-shadow"
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              >
                <div className={`w-12 h-12 rounded-lg ${f.iconBg} flex items-center justify-center mb-4`}>
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="container max-w-4xl">
          <div className="text-center mb-14">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">Three simple steps to connect and make a difference.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((step, i) => (
              <motion.div
                key={step.title}
                className="text-center relative"
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              >
                <div className="relative inline-block mb-6">
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <step.icon className="w-10 h-10 text-primary" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground shadow-glow">
                    {step.step}
                  </span>
                </div>
                <h3 className="font-heading font-bold text-lg text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Button variant="hero" size="lg" className="rounded-full px-10" asChild>
              <Link to="/register">Get Started <ArrowRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Impact */}
      <section className="py-20 px-4 gradient-primary">
        <div className="container max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-primary-foreground mb-4">Our Impact</h2>
            <p className="text-primary-foreground/80 text-lg">Real numbers. Real change.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {impactStats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="text-center bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-6 border border-primary-foreground/20"
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              >
                <stat.icon className="w-6 h-6 text-primary-foreground/80 mx-auto mb-3" />
                <p className="font-heading text-3xl md:text-4xl font-extrabold text-primary-foreground mb-1">{stat.value}</p>
                <p className="text-primary-foreground/80 text-sm font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {impactFeatures.map((f, i) => (
              <motion.div
                key={f.title}
                className="flex items-start gap-3 bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-5 border border-primary-foreground/20"
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              >
                <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0">
                  <f.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-primary-foreground mb-1">{f.title}</h4>
                  <p className="text-primary-foreground/80 text-sm">{f.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="container py-12 px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src={logoImg} alt="AccessAble logo" className="w-8 h-8 rounded-lg" />
                <span className="font-heading font-bold text-lg text-primary">AccessAble</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Empowering communities through accessibility awareness and inclusive technology.
              </p>
            </div>
            <div>
              <h4 className="font-heading font-semibold text-foreground mb-4">About</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Our Mission</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Team</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Press</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-heading font-semibold text-foreground mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Mail className="w-4 h-4" /> support@accessable.org</li>
                <li className="flex items-center gap-2"><Phone className="w-4 h-4" /> +1 (555) 123-4567</li>
                <li className="flex items-center gap-2"><Globe className="w-4 h-4" /> www.accessable.org</li>
              </ul>
            </div>
            <div>
              <h4 className="font-heading font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Accessibility Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
              </ul>
              <div className="flex gap-3">
                {[Facebook, Twitter, Linkedin, Instagram].map((Icon, i) => (
                  <a key={i} href="#" className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t pt-6 text-center text-sm text-muted-foreground">
            <p>© 2026 AccessAble. Built with purpose for an inclusive world.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
