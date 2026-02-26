import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, User, Lock, Phone, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import reflectLogo from "@/assets/reflect-health-logo.png";
import penguinIcon from "@/assets/penguin-icon.png";

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("admin@reflecthealth.com");
  const [password, setPassword] = useState("demo2026");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const data = await api.login(username, password);
      localStorage.setItem("authToken", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const isAuthenticated = !!localStorage.getItem("authToken");
  if (isAuthenticated) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, hsl(335 100% 60%), hsl(20 90% 55%))" }}
      >
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-32 right-16 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-white/[0.08] rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-16 py-12 h-full">
          <div className="mb-12">
            <div className="bg-white rounded-xl px-4 py-2 inline-block">
              <img src={reflectLogo} alt="Reflect Health" className="h-10 object-contain" />
            </div>
            <p className="text-white/70 text-sm mt-3 font-medium">AI Orchestration Command Center</p>
          </div>

          <div className="flex-1 flex items-center">
            <div className="w-full">
              <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-10 border border-white/20">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-8">
                  <Phone className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4 leading-tight">
                  Voice AI Call Deflection
                </h3>
                <p className="text-white/70 leading-relaxed text-base mb-6">
                  AI-powered phone agents handle eligibility verification, claims status, and prior
                  authorization inquiries automatically, reducing call center volume by 60-80%.
                </p>
                <div className="space-y-3">
                  {[
                    "Real-time provider authentication",
                    "Eligibility, claims & prior auth lookups",
                    "Warm transfers with full context",
                  ].map((text, i) => (
                    <div key={i} className="flex items-center text-white/80">
                      <CheckCircle className="w-5 h-5 mr-3 text-white shrink-0" />
                      {text}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 mt-8 opacity-70">
                <img src={penguinIcon} alt="PenguinAI" className="w-5 h-5" />
                <span className="text-xs text-white/60 font-medium">Powered by PenguinAI</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-8 py-12 bg-background">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="lg:hidden mb-6">
              <img src={reflectLogo} alt="Reflect Health" className="h-10 mx-auto object-contain" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-2">AI Command Center</h2>
            <p className="text-muted-foreground">Sign in to monitor voice AI performance</p>
          </div>

          <Card className="shadow-xl border-border">
            <CardContent className="pt-8 pb-8 px-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="username">Email</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-12"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <p className="text-destructive text-sm">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 reflect-gradient hover:opacity-90 text-white font-semibold rounded-xl shadow-lg"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Signing in...
                    </div>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>

              <div className="mt-4 p-3 bg-primary/5 rounded-xl border border-primary/15">
                <p className="text-xs text-primary text-center font-medium">
                  Demo: admin@reflecthealth.com / demo2026
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
