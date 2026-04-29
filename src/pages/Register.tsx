import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import logoImg from "@/assets/logo.png";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff } from "lucide-react";

type Role = "organization" | "volunteer" | "individual" | "donor" | "";

interface FormData {
  role: Role;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  organizationName: string;
  registrationId: string;
  address: string;
  skills: string;
  availability: string;
  individualType: "normal" | "differently_abled";
  accessibilityNeeds: string;
  individualAddress: string;
  preferredDonationType: string;
}

const Register = () => {
  const [form, setForm] = useState<FormData>({
    role: "", fullName: "", email: "", phone: "", password: "", confirmPassword: "",
    organizationName: "", registrationId: "", address: "",
    skills: "", availability: "",
    individualType: "normal", accessibilityNeeds: "", individualAddress: "",
    preferredDonationType: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate(`/dashboard/${profile?.role || "individual"}`);
    }
  }, [user, loading, profile, navigate]);

  const update = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.role) errs.role = "Please select a role";
    if (!form.fullName.trim()) errs.fullName = "Name is required";
    else if (form.fullName.trim().length < 2) errs.fullName = "Name must be at least 2 characters";
    else if (form.fullName.trim().length > 100) errs.fullName = "Name must be less than 100 characters";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Invalid email format";
    if (!form.phone.trim()) errs.phone = "Phone is required";
    else if (!/^\+?[\d\s\-()]{7,15}$/.test(form.phone)) errs.phone = "Invalid phone format";
    if (!form.password) errs.password = "Password is required";
    else if (form.password.length < 8) errs.password = "Password must be at least 8 characters";
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password))
      errs.password = "Must include uppercase, lowercase, and number";
    if (form.password !== form.confirmPassword) errs.confirmPassword = "Passwords don't match";

    if (form.role === "organization") {
      if (!form.organizationName.trim()) errs.organizationName = "Organization name is required";
      if (!form.registrationId.trim()) errs.registrationId = "Registration ID is required";
      if (!form.address.trim()) errs.address = "Address is required";
    }
    if (form.role === "volunteer") {
      if (!form.skills.trim()) errs.skills = "Skills are required";
      if (!form.availability) errs.availability = "Availability is required";
    }
    if (form.role === "individual") {
      if (!form.individualAddress.trim()) errs.individualAddress = "Address is required";
      if (form.individualType === "differently_abled" && !form.accessibilityNeeds.trim())
        errs.accessibilityNeeds = "Please describe your accessibility needs";
    }
    if (form.role === "donor") {
      if (!form.preferredDonationType) errs.preferredDonationType = "Please select donation type";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);

    const metadata: Record<string, string> = {
      full_name: form.fullName.trim(),
      role: form.role,
    };

    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: { data: metadata, emailRedirectTo: window.location.origin },
    });

    if (error) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
      setIsLoading(false);
      return;
    }

    // Update profile with role-specific fields
    const user = data.user;
    if (user) {
      const profileUpdate: Record<string, unknown> = { phone: form.phone.trim() };
      if (form.role === "organization") {
        profileUpdate.organization_name = form.organizationName.trim();
        profileUpdate.registration_id = form.registrationId.trim();
        profileUpdate.address = form.address.trim();
      } else if (form.role === "volunteer") {
        profileUpdate.skills = form.skills.trim();
        profileUpdate.availability = form.availability;
      } else if (form.role === "individual") {
        profileUpdate.individual_type = form.individualType;
        profileUpdate.accessibility_needs = form.accessibilityNeeds.trim() || null;
        profileUpdate.address = form.individualAddress.trim();
      } else if (form.role === "donor") {
        profileUpdate.preferred_donation_type = form.preferredDonationType;
      }
      await supabase.from("profiles").upsert({
        id: user.id,
        email: form.email.trim(),
        full_name: form.fullName.trim(),
        role: form.role as Exclude<Role, "">,
        ...profileUpdate,
      });
    }

    toast({ title: "Account created!", description: "Welcome to AccessAble." });
    navigate(`/dashboard/${form.role}`);
    setIsLoading(false);
  };

  const FieldError = ({ field }: { field: string }) =>
    errors[field] ? <p className="text-destructive text-xs">{errors[field]}</p> : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-10">
      <motion.div className="w-full max-w-lg bg-card rounded-2xl border shadow-sm p-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-center gap-2 mb-6">
          <img src={logoImg} alt="AccessAble logo" className="w-10 h-10 rounded-xl" />
          <span className="font-heading font-bold text-xl text-primary">AccessAble</span>
        </div>
        <h1 className="font-heading text-2xl font-bold text-center text-foreground mb-2">Create Account</h1>
        <p className="text-muted-foreground text-center text-sm mb-8">Join our community and start making an impact.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>I want to join as <span className="text-destructive">*</span></Label>
            <Select value={form.role} onValueChange={(v) => update("role", v)}>
              <SelectTrigger className={errors.role ? "border-destructive" : ""}><SelectValue placeholder="Select your role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="organization">Organization</SelectItem>
                <SelectItem value="volunteer">Volunteer</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="donor">Donor</SelectItem>
              </SelectContent>
            </Select>
            <FieldError field="role" />
          </div>

          <AnimatePresence mode="wait">
            {form.role && (
              <motion.div key={form.role} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name <span className="text-destructive">*</span></Label>
                    <Input placeholder="John Doe" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} className={errors.fullName ? "border-destructive" : ""} maxLength={100} />
                    <FieldError field="fullName" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email <span className="text-destructive">*</span></Label>
                    <Input type="email" placeholder="you@example.com" value={form.email} onChange={(e) => update("email", e.target.value)} className={errors.email ? "border-destructive" : ""} maxLength={255} />
                    <FieldError field="email" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone <span className="text-destructive">*</span></Label>
                    <Input placeholder="+1 (555) 000-0000" value={form.phone} onChange={(e) => update("phone", e.target.value)} className={errors.phone ? "border-destructive" : ""} maxLength={15} />
                    <FieldError field="phone" />
                  </div>
                  <div className="space-y-2">
                    <Label>Password <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} placeholder="Create password" value={form.password} onChange={(e) => update("password", e.target.value)} className={errors.password ? "border-destructive pr-10" : "pr-10"} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <FieldError field="password" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Confirm Password <span className="text-destructive">*</span></Label>
                  <Input type="password" placeholder="Confirm password" value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} className={errors.confirmPassword ? "border-destructive" : ""} />
                  <FieldError field="confirmPassword" />
                </div>

                {form.role === "organization" && (
                  <>
                    <div className="space-y-2">
                      <Label>Organization Name <span className="text-destructive">*</span></Label>
                      <Input placeholder="Organization name" value={form.organizationName} onChange={(e) => update("organizationName", e.target.value)} className={errors.organizationName ? "border-destructive" : ""} />
                      <FieldError field="organizationName" />
                    </div>
                    <div className="space-y-2">
                      <Label>Registration ID <span className="text-destructive">*</span></Label>
                      <Input placeholder="Organization registration ID" value={form.registrationId} onChange={(e) => update("registrationId", e.target.value)} className={errors.registrationId ? "border-destructive" : ""} />
                      <FieldError field="registrationId" />
                    </div>
                    <div className="space-y-2">
                      <Label>Address <span className="text-destructive">*</span></Label>
                      <Textarea placeholder="Full address" rows={2} value={form.address} onChange={(e) => update("address", e.target.value)} className={errors.address ? "border-destructive" : ""} />
                      <FieldError field="address" />
                    </div>
                  </>
                )}

                {form.role === "volunteer" && (
                  <>
                    <div className="space-y-2">
                      <Label>Skills <span className="text-destructive">*</span></Label>
                      <Input placeholder="e.g. Teaching, Medical, Technical" value={form.skills} onChange={(e) => update("skills", e.target.value)} className={errors.skills ? "border-destructive" : ""} />
                      <FieldError field="skills" />
                    </div>
                    <div className="space-y-2">
                      <Label>Availability <span className="text-destructive">*</span></Label>
                      <Select value={form.availability} onValueChange={(v) => update("availability", v)}>
                        <SelectTrigger className={errors.availability ? "border-destructive" : ""}><SelectValue placeholder="Select availability" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekdays">Weekdays</SelectItem>
                          <SelectItem value="weekends">Weekends</SelectItem>
                          <SelectItem value="flexible">Flexible</SelectItem>
                        </SelectContent>
                      </Select>
                      <FieldError field="availability" />
                    </div>
                  </>
                )}

                {form.role === "individual" && (
                  <>
                    <div className="space-y-2">
                      <Label>Category <span className="text-destructive">*</span></Label>
                      <RadioGroup value={form.individualType} onValueChange={(v) => update("individualType", v)} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="normal" id="normal" />
                          <Label htmlFor="normal" className="cursor-pointer">Normal Individual</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="differently_abled" id="da" />
                          <Label htmlFor="da" className="cursor-pointer">Differently Abled</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    {form.individualType === "differently_abled" && (
                      <div className="space-y-2">
                        <Label>Accessibility Needs <span className="text-destructive">*</span></Label>
                        <Textarea placeholder="Describe any specific needs or requirements" rows={2} value={form.accessibilityNeeds} onChange={(e) => update("accessibilityNeeds", e.target.value)} className={errors.accessibilityNeeds ? "border-destructive" : ""} maxLength={500} />
                        <FieldError field="accessibilityNeeds" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Address <span className="text-destructive">*</span></Label>
                      <Input placeholder="Your address" value={form.individualAddress} onChange={(e) => update("individualAddress", e.target.value)} className={errors.individualAddress ? "border-destructive" : ""} />
                      <FieldError field="individualAddress" />
                    </div>
                  </>
                )}

                {form.role === "donor" && (
                  <div className="space-y-2">
                    <Label>Preferred Donation Type <span className="text-destructive">*</span></Label>
                    <Select value={form.preferredDonationType} onValueChange={(v) => update("preferredDonationType", v)}>
                      <SelectTrigger className={errors.preferredDonationType ? "border-destructive" : ""}><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="funds">Financial Funds</SelectItem>
                        <SelectItem value="resources">Resources / Materials</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldError field="preferredDonationType" />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <Button type="submit" variant="hero" className="w-full" size="lg" disabled={!form.role || isLoading}>
            {isLoading ? "Creating Account..." : "Create Account"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
