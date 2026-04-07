import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff } from "lucide-react";

const SettingsPage = () => {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      toast({ title: "Must include uppercase, lowercase, and number", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Password updated successfully!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setIsLoading(false);
  };

  return (
    <div className="max-w-2xl space-y-8">
      <h2 className="font-heading text-xl font-bold text-foreground">Settings</h2>

      {/* Change Password */}
      <div className="bg-card rounded-xl border p-6">
        <h3 className="font-heading font-semibold text-foreground mb-4">Change Password</h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-2">
            <Label>New Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="pr-10"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">8+ chars, uppercase, lowercase, number</p>
          </div>
          <div className="space-y-2">
            <Label>Confirm New Password</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
          </div>
          <Button type="submit" variant="hero" disabled={isLoading}>
            {isLoading ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </div>

      {/* Notification Settings */}
      <div className="bg-card rounded-xl border p-6">
        <h3 className="font-heading font-semibold text-foreground mb-4">Notification Preferences</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground text-sm">Email Notifications</p>
              <p className="text-muted-foreground text-xs">Receive updates via email</p>
            </div>
            <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground text-sm">Push Notifications</p>
              <p className="text-muted-foreground text-xs">Receive in-app notifications</p>
            </div>
            <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
